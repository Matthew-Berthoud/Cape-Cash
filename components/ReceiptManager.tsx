import React, { useRef, useState } from 'react';
import { Receipt } from '../types';
import { analyzeReceipt } from '../services/geminiService';
import ImagePreviewModal from './ImagePreviewModal';

// Declare heic2any globally
declare const heic2any: any;

interface ReceiptManagerProps {
  receipts: Receipt[];
  onAddReceipts: (newReceipts: Receipt[]) => void;
  onUpdateReceipt: (id: string, updates: Partial<Receipt>) => void;
  onNavigateNext: () => void;
  onDeleteReceipt: (id: string) => void;
}

const ReceiptManager: React.FC<ReceiptManagerProps> = ({ 
  receipts, 
  onAddReceipts, 
  onUpdateReceipt, 
  onNavigateNext,
  onDeleteReceipt
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewImage, setPreviewImage] = useState<{url: string, mime: string} | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      
      const newReceipts: Receipt[] = await Promise.all(files.map(async (file: File) => {
        let processFile = file;

        // HEIC Conversion
        if (file.name.toLowerCase().endsWith('.heic') || file.type === 'image/heic') {
             try {
                 const blobOrBlobs = await heic2any({
                     blob: file,
                     toType: "image/jpeg",
                     quality: 0.8
                 });
                 // heic2any can return an array if the HEIC has multiple images, or a single blob
                 const blob = Array.isArray(blobOrBlobs) ? blobOrBlobs[0] : blobOrBlobs;
                 processFile = new File([blob], file.name.replace(/\.heic$/i, ".jpg"), { type: "image/jpeg" });
             } catch (err) {
                 console.error("Error converting HEIC", err);
                 // Fallback to original file if conversion fails, though it might not display
             }
        }

        return new Promise<Receipt>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64String = reader.result as string;
            resolve({
              id: Math.random().toString(36).substr(2, 9),
              fileData: base64String, // Keep full data URL for preview img src
              mimeType: processFile.type,
              status: 'pending'
            });
          };
          reader.readAsDataURL(processFile);
        });
      }));

      onAddReceipts(newReceipts);
      
      // Trigger AI processing for each
      newReceipts.forEach(async (receipt) => {
        onUpdateReceipt(receipt.id, { status: 'processing' });
        try {
            // Strip header for Gemini
            const base64Content = receipt.fileData.split(',')[1];
            const data = await analyzeReceipt(base64Content, receipt.mimeType);
            onUpdateReceipt(receipt.id, {
                status: 'completed',
                extractedDate: data.date,
                extractedAmount: data.amount,
                extractedCategory: data.category,
                extractedDescription: data.description
            });
        } catch (error) {
            onUpdateReceipt(receipt.id, { status: 'error' });
        }
      });
      
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const isProcessing = receipts.some(r => r.status === 'processing');
  const hasReceipts = receipts.length > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-full flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-3xl font-bold text-gray-900">Receipt Management</h1>
            <p className="text-gray-500 mt-1">Upload receipts to automatically parse details using Gemini AI.</p>
        </div>
        <div>
            <input 
                type="file" 
                multiple 
                accept="image/*,application/pdf,.heic" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileUpload}
            />
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-cape-primary hover:bg-cape-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cape-primary mr-3"
            >
                <i className="fa-solid fa-upload mr-2"></i> Upload / Camera
            </button>
            
            <button
                onClick={onNavigateNext}
                disabled={isProcessing}
                className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
                    ${isProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'} 
                    focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors`}
            >
                Next: Expense Form <i className="fa-solid fa-arrow-right ml-2"></i>
            </button>
        </div>
      </div>

      {/* Progress Indicator */}
      {isProcessing && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 animate-pulse">
          <div className="flex">
            <div className="flex-shrink-0">
              <i className="fa-solid fa-circle-notch fa-spin text-blue-400"></i>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                AI is analyzing your receipts. Please wait...
              </p>
            </div>
          </div>
        </div>
      )}

      {!hasReceipts && (
        <div className="flex-1 flex flex-col items-center justify-center border-4 border-dashed border-gray-200 rounded-lg p-12 text-center">
            <i className="fa-regular fa-image text-6xl text-gray-300 mb-4"></i>
            <h3 className="text-lg font-medium text-gray-900">No receipts uploaded</h3>
            <p className="text-gray-500 mt-2">Upload images, PDFs, or HEIC files.</p>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 overflow-y-auto pb-20">
        {receipts.map(receipt => (
            <div key={receipt.id} className="relative group bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
                <div className="aspect-w-10 aspect-h-7 bg-gray-200 block overflow-hidden relative">
                    {receipt.mimeType === 'application/pdf' ? (
                         <div className="w-full h-48 flex items-center justify-center bg-gray-100">
                             <i className="fa-solid fa-file-pdf text-6xl text-red-500"></i>
                         </div>
                    ) : (
                        <img src={receipt.fileData} alt="Receipt" className="object-cover w-full h-48" />
                    )}
                    
                    {/* Status Overlay */}
                    <div className="absolute top-2 right-2 z-10">
                        {receipt.status === 'processing' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                Parsing...
                            </span>
                        )}
                        {receipt.status === 'completed' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <i className="fa-solid fa-check mr-1"></i> Done
                            </span>
                        )}
                        {receipt.status === 'error' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Failed
                            </span>
                        )}
                    </div>

                    {/* View Button Overlay */}
                    <button 
                        onClick={() => setPreviewImage({ url: receipt.fileData, mime: receipt.mimeType })}
                        className="absolute inset-0 w-full h-full bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100"
                    >
                        <span className="bg-white text-gray-800 rounded-full p-2 shadow-lg transform hover:scale-110 transition-transform">
                            <i className="fa-solid fa-magnifying-glass-plus"></i>
                        </span>
                    </button>

                    <button 
                        onClick={(e) => { e.stopPropagation(); onDeleteReceipt(receipt.id); }}
                        className="absolute top-2 left-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 z-10 hover:bg-red-700"
                        title="Delete Receipt"
                    >
                        <i className="fa-solid fa-trash text-xs"></i>
                    </button>
                </div>
                
                <div className="p-4">
                    {receipt.status === 'completed' ? (
                        <div className="text-sm space-y-1">
                             <div className="flex justify-between">
                                <span className="text-gray-500">Date:</span>
                                <span className="font-medium">{receipt.extractedDate}</span>
                             </div>
                             <div className="flex justify-between">
                                <span className="text-gray-500">Amount:</span>
                                <span className="font-medium text-green-600">${receipt.extractedAmount?.toFixed(2)}</span>
                             </div>
                             <div className="mt-2">
                                <span className="block text-xs text-gray-400 uppercase">Category AI Prediction</span>
                                <span className="block text-xs font-medium truncate text-cape-primary" title={receipt.extractedCategory}>
                                    {receipt.extractedCategory}
                                </span>
                             </div>
                        </div>
                    ) : (
                        <div className="h-20 flex items-center justify-center text-sm text-gray-400 italic">
                            {receipt.status === 'processing' ? 'Extracting data...' : 'Ready for form'}
                        </div>
                    )}
                </div>
            </div>
        ))}
      </div>

      <ImagePreviewModal 
        isOpen={!!previewImage} 
        imageUrl={previewImage?.url || ''} 
        mimeType={previewImage?.mime}
        onClose={() => setPreviewImage(null)} 
      />
    </div>
  );
};

export default ReceiptManager;