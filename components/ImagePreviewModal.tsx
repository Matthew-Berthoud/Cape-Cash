import React from 'react';

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  mimeType?: string;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ isOpen, onClose, imageUrl, mimeType }) => {
  if (!isOpen) return null;

  const isPdf = mimeType === 'application/pdf' || imageUrl.startsWith('data:application/pdf');

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-900 bg-opacity-90 transition-opacity" aria-hidden="true" onClick={onClose}></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className="inline-block align-middle bg-transparent text-left overflow-hidden shadow-xl transform transition-all sm:max-w-5xl sm:w-full">
            <div className="relative p-2">
                <button
                    onClick={onClose}
                    className="absolute -top-10 right-0 text-white hover:text-gray-300 focus:outline-none transition-colors"
                >
                    <span className="sr-only">Close</span>
                    <i className="fa-solid fa-xmark text-3xl"></i>
                </button>
                
                {isPdf ? (
                     <div className="bg-white rounded-md h-[80vh] w-full">
                        <object 
                            data={imageUrl} 
                            type="application/pdf" 
                            className="w-full h-full rounded-md"
                        >
                            <p className="p-4 text-center">
                                Your browser does not support embedded PDFs. 
                                <a href={imageUrl} download="receipt.pdf" className="text-blue-600 underline">Download it here</a>.
                            </p>
                        </object>
                     </div>
                ) : (
                    <img 
                        src={imageUrl} 
                        alt="Receipt Preview" 
                        className="w-full h-auto max-h-[90vh] object-contain rounded-md shadow-2xl" 
                    />
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default ImagePreviewModal;