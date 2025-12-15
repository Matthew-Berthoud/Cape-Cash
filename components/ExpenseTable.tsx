import React, { useState } from 'react';
import { Expense, Receipt, User } from '../types';
import { CATEGORIES, PROJECTS } from '../constants';
import { generatePDF } from '../utils/pdfGenerator';
import ImagePreviewModal from './ImagePreviewModal';

interface ExpenseTableProps {
  expenses: Expense[];
  receipts: Receipt[];
  user: User;
  onUpdateUser: (updates: Partial<User>) => void;
  onUpdateExpense: (id: string, field: keyof Expense, value: any) => void;
  onAddExpense: () => void;
  onDeleteExpense: (id: string) => void;
  onNavigateBack: () => void;
  onLinkReceipts: (expenseId: string, receiptIds: string[]) => void;
}

const ExpenseTable: React.FC<ExpenseTableProps> = ({
  expenses,
  receipts,
  user,
  onUpdateUser,
  onUpdateExpense,
  onAddExpense,
  onDeleteExpense,
  onNavigateBack,
  onLinkReceipts
}) => {
  const [editingReceiptLinksFor, setEditingReceiptLinksFor] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{url: string, mime: string} | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const totalAmount = expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const allReviewed = expenses.length > 0 && expenses.every(e => e.isReviewed);
  const hasSupervisor = user.supervisor && user.supervisor.trim().length > 0;
  
  const canExport = allReviewed && hasSupervisor;
  
  let exportTooltip = "";
  if (!hasSupervisor) exportTooltip = "Please enter a Supervisor Name to enable export.";
  else if (!allReviewed) exportTooltip = "Please review all expense items (check the boxes) before exporting.";
  else exportTooltip = "Generate PDF Report";

  const handleReceiptToggle = (expenseId: string, receiptId: string) => {
    const expense = expenses.find(e => e.id === expenseId);
    if (!expense) return;

    const newLinks = expense.linkedReceiptIds.includes(receiptId)
      ? expense.linkedReceiptIds.filter(id => id !== receiptId)
      : [...expense.linkedReceiptIds, receiptId];
    
    onLinkReceipts(expenseId, newLinks);
  };

  const handleDownloadPdf = async () => {
    if (!canExport) return;

    setIsGeneratingPdf(true);
    try {
        await generatePDF(expenses, receipts, user);
    } catch (e) {
        console.error(e);
        alert("Failed to generate PDF. Check console for details.");
    } finally {
        setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header Toolbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex items-center space-x-4">
            <button 
                onClick={onNavigateBack}
                className="text-gray-500 hover:text-cape-primary transition-colors"
            >
                <i className="fa-solid fa-arrow-left text-xl"></i>
            </button>
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Expense Report</h1>
                <p className="text-sm text-gray-500">Review, correct, and verify your expense items.</p>
            </div>
        </div>
        <div className="flex items-center space-x-3">
            <div className="bg-cape-secondary px-4 py-2 rounded-lg mr-4">
                <span className="text-sm font-bold text-cape-dark uppercase tracking-wide">Total: </span>
                <span className="text-xl font-bold text-cape-primary">${totalAmount.toFixed(2)}</span>
            </div>
            
            <div className="relative group">
                <button 
                    onClick={handleDownloadPdf}
                    disabled={!canExport || isGeneratingPdf}
                    className={`inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white 
                        ${!canExport || isGeneratingPdf ? 'bg-gray-400 cursor-not-allowed' : 'bg-cape-primary hover:bg-cape-dark'} 
                        focus:outline-none transition-colors`}
                >
                    {isGeneratingPdf ? (
                        <><i className="fa-solid fa-circle-notch fa-spin mr-2"></i> Generating...</>
                    ) : (
                        <><i className="fa-solid fa-file-pdf mr-2"></i> Export PDF</>
                    )}
                </button>
                {/* Custom Tooltip */}
                {(!canExport) && (
                    <div className="absolute right-0 top-full mt-2 w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-50 hidden group-hover:block text-center">
                        {exportTooltip}
                        <div className="absolute bottom-full right-4 -mb-1 border-4 border-transparent border-b-gray-800"></div>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* User Details Section */}
      <div className="bg-gray-50 px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-6 border-b border-gray-200">
          <div>
            <label htmlFor="employeeName" className="block text-sm font-medium text-gray-700">Employee Name</label>
            <input
              type="text"
              id="employeeName"
              value={user.name}
              onChange={(e) => onUpdateUser({ name: e.target.value })}
              className="mt-1 block w-full bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-cape-primary focus:border-cape-primary sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="employeeEmail" className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              id="employeeEmail"
              value={user.email}
              onChange={(e) => onUpdateUser({ email: e.target.value })}
              className="mt-1 block w-full bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-cape-primary focus:border-cape-primary sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="supervisorName" className="block text-sm font-medium text-gray-700">Supervisor Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              id="supervisorName"
              value={user.supervisor}
              onChange={(e) => onUpdateUser({ supervisor: e.target.value })}
              placeholder="e.g. Mike Santamaria"
              className={`mt-1 block w-full bg-white text-gray-900 border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-cape-primary focus:border-cape-primary sm:text-sm ${!hasSupervisor ? 'border-red-300' : 'border-gray-300'}`}
            />
          </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-auto p-6">
        <div className="bg-white shadow rounded-lg overflow-hidden min-w-[1200px] mb-10"> 
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-cape-secondary">
              <tr>
                <th scope="col" className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider w-12">
                   <i className="fa-solid fa-check-double" title="Reviewed?"></i>
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-36">Date</th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-48">Category</th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-40">Project</th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider max-w-xs">Description</th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-32">Amount</th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-40">Receipts</th>
                <th scope="col" className="relative px-3 py-3 w-16"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {expenses.map((expense) => (
                <tr key={expense.id} className={`transition-colors ${expense.isReviewed ? 'hover:bg-gray-50' : 'bg-yellow-50 hover:bg-yellow-100'}`}>
                  {/* Reviewed Checkbox */}
                  <td className="px-3 py-4 align-middle text-center">
                    <input 
                        type="checkbox"
                        checked={expense.isReviewed}
                        onChange={(e) => onUpdateExpense(expense.id, 'isReviewed', e.target.checked)}
                        className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded cursor-pointer"
                        title="Mark as reviewed"
                    />
                  </td>

                  <td className="px-3 py-4 whitespace-nowrap align-top">
                    <input
                      type="date"
                      value={expense.date}
                      onChange={(e) => onUpdateExpense(expense.id, 'date', e.target.value)}
                      className="block w-full bg-white text-gray-900 border-gray-300 rounded-md shadow-sm focus:ring-cape-primary focus:border-cape-primary sm:text-sm"
                    />
                  </td>
                  <td className="px-3 py-4 align-top">
                    <select
                      value={expense.category}
                      onChange={(e) => onUpdateExpense(expense.id, 'category', e.target.value)}
                      className="block w-full bg-white text-gray-900 border-gray-300 rounded-md shadow-sm focus:ring-cape-primary focus:border-cape-primary sm:text-xs truncate"
                      title={expense.category}
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-4 align-top">
                    <select
                      value={expense.project}
                      onChange={(e) => onUpdateExpense(expense.id, 'project', e.target.value)}
                      className="block w-full bg-white text-gray-900 border-gray-300 rounded-md shadow-sm focus:ring-cape-primary focus:border-cape-primary sm:text-xs truncate"
                      title={expense.project}
                    >
                      {PROJECTS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-4 align-top">
                    <input
                      type="text"
                      value={expense.description}
                      onChange={(e) => onUpdateExpense(expense.id, 'description', e.target.value)}
                      className="block w-full bg-white text-gray-900 border-gray-300 rounded-md shadow-sm focus:ring-cape-primary focus:border-cape-primary sm:text-sm truncate"
                      placeholder="Expense details..."
                      title={expense.description} // Hover to see full description
                    />
                  </td>
                  <td className="px-3 py-4 align-top">
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">$</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={expense.amount}
                        onChange={(e) => onUpdateExpense(expense.id, 'amount', parseFloat(e.target.value))}
                        className="focus:ring-cape-primary focus:border-cape-primary block w-full bg-white text-gray-900 pl-7 pr-2 sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                  </td>
                  <td className="px-3 py-4 align-top">
                    <button
                        onClick={() => setEditingReceiptLinksFor(expense.id)}
                        className={`inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-full shadow-sm 
                        ${expense.linkedReceiptIds.length > 0 ? 'text-cape-primary bg-purple-50 border-purple-200' : 'text-gray-700 bg-white hover:bg-gray-50'}`}
                    >
                        <i className="fa-solid fa-paperclip mr-1.5"></i>
                        {expense.linkedReceiptIds.length} Linked
                    </button>
                  </td>
                  <td className="px-3 py-4 text-center align-middle">
                    <button 
                        onClick={() => onDeleteExpense(expense.id)}
                        className="text-red-400 hover:text-red-600 transition-colors p-2"
                        title="Delete Row"
                    >
                        <i className="fa-solid fa-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
              
              {/* Add Row Button at the bottom */}
              <tr>
                <td colSpan={8} className="px-3 py-4">
                    <button 
                        onClick={onAddExpense}
                        className="w-full flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:text-cape-primary hover:border-cape-primary hover:bg-gray-50 transition-colors"
                    >
                        <i className="fa-solid fa-plus mr-2"></i> Add New Expense Row
                    </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Link Receipts Modal */}
      {editingReceiptLinksFor && (
        <div className="fixed z-50 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setEditingReceiptLinksFor(null)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Link Receipts to Expense
                    </h3>
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto p-2">
                        {receipts.length === 0 && <p className="text-gray-500 col-span-4">No receipts uploaded.</p>}
                        {receipts.map(r => {
                            const isLinked = expenses.find(e => e.id === editingReceiptLinksFor)?.linkedReceiptIds.includes(r.id);
                            return (
                                <div 
                                    key={r.id} 
                                    className={`relative rounded-lg border-2 p-1 group ${isLinked ? 'border-cape-primary ring-2 ring-cape-secondary' : 'border-gray-200 hover:border-gray-300'}`}
                                >
                                    {/* Selection click area */}
                                    <div 
                                        onClick={() => handleReceiptToggle(editingReceiptLinksFor!, r.id)}
                                        className="cursor-pointer"
                                    >
                                        {r.mimeType === 'application/pdf' ? (
                                            <div className="h-32 w-full flex items-center justify-center bg-gray-100 rounded">
                                                 <i className="fa-solid fa-file-pdf text-4xl text-red-500"></i>
                                            </div>
                                        ) : (
                                            <img src={r.fileData} className="h-32 w-full object-cover rounded" alt="Receipt thumbnail" />
                                        )}
                                        
                                        <div className="absolute top-2 right-2 z-10">
                                            {isLinked && <i className="fa-solid fa-circle-check text-cape-primary text-xl bg-white rounded-full"></i>}
                                        </div>
                                        <div className="mt-1 text-xs text-gray-500 truncate">
                                            ${r.extractedAmount || 0} - {r.extractedDate || 'No Date'}
                                        </div>
                                    </div>
                                    
                                    {/* View Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setPreviewImage({ url: r.fileData, mime: r.mimeType });
                                        }}
                                        className="absolute bottom-8 right-2 p-1 bg-gray-800 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black"
                                        title="View Full Size"
                                    >
                                        <i className="fa-solid fa-magnifying-glass text-xs"></i>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button 
                    type="button" 
                    onClick={() => setEditingReceiptLinksFor(null)}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-cape-primary text-base font-medium text-white hover:bg-cape-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cape-primary sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ImagePreviewModal 
        isOpen={!!previewImage} 
        imageUrl={previewImage?.url || ''} 
        mimeType={previewImage?.mime}
        onClose={() => setPreviewImage(null)} 
      />
    </div>
  );
};

export default ExpenseTable;