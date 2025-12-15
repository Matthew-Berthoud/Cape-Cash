import React, { useState, useEffect } from 'react';
import { User, Expense } from '../types';

declare const window: any;

interface EmailReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  user: User;
  expenses: Expense[];
}

interface EmailForm {
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
}

const EmailReviewModal: React.FC<EmailReviewModalProps> = ({ isOpen, onClose, pdfUrl, user, expenses }) => {
  const [step, setStep] = useState<'preview' | 'compose'>('preview');
  const [form, setForm] = useState<EmailForm>({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    body: ''
  });
  const [numPages, setNumPages] = useState<number>(0);
  const [loadingPdf, setLoadingPdf] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && expenses.length > 0) {
      // Calculate date range
      const timestamps = expenses.map(e => new Date(e.date).getTime()).filter(t => !isNaN(t));
      const minDate = new Date(Math.min(...timestamps)).toLocaleDateString();
      const maxDate = new Date(Math.max(...timestamps)).toLocaleDateString();

      setForm({
        to: 'blackcapeio@bill.com',
        cc: 'expensereport@blackcape.io',
        bcc: '',
        subject: 'Expense Reimbursement Request',
        body: `Hello,\n\nHere are my expenses from ${minDate} to ${maxDate}.\n\nBest,\n${user.name}\n\nPowered by Cape Cash`
      });
      setStep('preview');
      setNumPages(0);
    }
  }, [isOpen, user.name, expenses]);

  // Load PDF Document Info
  useEffect(() => {
    if (isOpen && step === 'preview' && pdfUrl) {
      const loadPdfInfo = async () => {
        setLoadingPdf(true);
        try {
            if (!window.pdfjsLib) {
                console.error("PDF.js not loaded");
                return;
            }
            if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            }
            
            const loadingTask = window.pdfjsLib.getDocument(pdfUrl);
            const pdf = await loadingTask.promise;
            setNumPages(pdf.numPages);
        } catch (e) {
            console.error("Error loading PDF", e);
        } finally {
            setLoadingPdf(false);
        }
      };
      loadPdfInfo();
    }
  }, [isOpen, step, pdfUrl]);

  // Render Pages
  useEffect(() => {
    if (numPages > 0 && isOpen && step === 'preview' && pdfUrl) {
       const renderPages = async () => {
           const loadingTask = window.pdfjsLib.getDocument(pdfUrl);
           const pdf = await loadingTask.promise;
           
           for (let i = 1; i <= numPages; i++) {
               const page = await pdf.getPage(i);
               const scale = 1.0; // Base scale
               
               // Calculate fit scale (e.g. fit width of container approx 800px)
               const viewportBase = page.getViewport({ scale: 1.0 });
               const desiredWidth = 750;
               const fitScale = desiredWidth / viewportBase.width;
               
               const viewport = page.getViewport({ scale: fitScale });
               
               const canvas = document.getElementById(`pdf-render-${i}`) as HTMLCanvasElement;
               if (canvas) {
                   const context = canvas.getContext('2d');
                   if (context) {
                       canvas.height = viewport.height;
                       canvas.width = viewport.width;
                       
                       // Render
                       const renderContext = {
                           canvasContext: context,
                           viewport: viewport
                       };
                       await page.render(renderContext).promise;
                   }
               }
           }
       };
       // Allow DOM to update with canvas elements
       setTimeout(() => renderPages(), 50);
    }
  }, [numPages, isOpen, step, pdfUrl]);

  if (!isOpen) return null;

  const handleOpenGmail = () => {
    // 1. Trigger Download of the PDF
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `expense_report_${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // 2. Open Gmail Compose
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(form.to)}&cc=${encodeURIComponent(form.cc)}&bcc=${encodeURIComponent(form.bcc)}&su=${encodeURIComponent(form.subject)}&body=${encodeURIComponent(form.body)}`;
    window.open(gmailUrl, '_blank');

    // 3. Notify user
    alert("Gmail draft opened! Your PDF report has been downloaded to your computer. Please drag and drop it into the email attachment area.");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        
        <div className="inline-block align-middle bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
              {step === 'preview' ? 'Review PDF Report' : 'Compose Email'}
            </h3>
          </div>

          {/* Content */}
          <div className="bg-gray-50 px-4 py-4 sm:p-6 h-[70vh] flex flex-col">
            {step === 'preview' ? (
              <div className="flex-1 bg-gray-200 rounded-md overflow-y-auto border border-gray-300 p-4 flex flex-col items-center gap-4">
                {loadingPdf && (
                    <div className="flex items-center justify-center h-full">
                        <i className="fa-solid fa-circle-notch fa-spin text-3xl text-gray-400"></i>
                    </div>
                )}
                {!loadingPdf && numPages === 0 && (
                     <div className="text-red-500">Failed to load PDF preview.</div>
                )}
                
                {Array.from({ length: numPages }, (_, i) => (
                    <canvas 
                        key={i + 1} 
                        id={`pdf-render-${i + 1}`} 
                        className="shadow-lg bg-white"
                        style={{ maxWidth: '100%' }}
                    />
                 ))}
              </div>
            ) : (
              <div className="flex-1 space-y-4 overflow-y-auto px-2">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">To</label>
                    <input
                      type="text"
                      value={form.to}
                      onChange={(e) => setForm({...form, to: e.target.value})}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-cape-primary focus:border-cape-primary sm:text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">CC</label>
                      <input
                        type="text"
                        value={form.cc}
                        onChange={(e) => setForm({...form, cc: e.target.value})}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-cape-primary focus:border-cape-primary sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">BCC</label>
                      <input
                        type="text"
                        value={form.bcc}
                        onChange={(e) => setForm({...form, bcc: e.target.value})}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-cape-primary focus:border-cape-primary sm:text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Subject</label>
                    <input
                      type="text"
                      value={form.subject}
                      onChange={(e) => setForm({...form, subject: e.target.value})}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-cape-primary focus:border-cape-primary sm:text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700">Body</label>
                    <textarea
                      rows={8}
                      value={form.body}
                      onChange={(e) => setForm({...form, body: e.target.value})}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-cape-primary focus:border-cape-primary sm:text-sm"
                    />
                  </div>
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <i className="fa-solid fa-paperclip text-yellow-400"></i>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-yellow-700">
                          The generated PDF will be downloaded when you click "Open in Gmail". Please remember to attach it to your email manually.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200">
            {step === 'preview' ? (
              <button
                type="button"
                onClick={() => setStep('compose')}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-cape-primary text-base font-medium text-white hover:bg-cape-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cape-primary sm:ml-3 sm:w-auto sm:text-sm"
              >
                Confirm & Draft Email <i className="fa-solid fa-arrow-right ml-2"></i>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleOpenGmail}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-cape-primary text-base font-medium text-white hover:bg-cape-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cape-primary sm:ml-3 sm:w-auto sm:text-sm"
              >
                <i className="fa-brands fa-google mr-2"></i> Open in Gmail
              </button>
            )}

            {step === 'compose' && (
              <button
                type="button"
                onClick={() => setStep('preview')}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Back
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailReviewModal;