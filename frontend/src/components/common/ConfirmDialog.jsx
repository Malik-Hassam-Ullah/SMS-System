import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';

export default function ConfirmDialog({
 isOpen,
 title,
 message,
 confirmLabel = 'Confirm',
 cancelLabel = 'Cancel',
 onConfirm,
 onCancel,
 variant = 'danger'
}) {
 if (!isOpen) return null;

 const isDanger = variant === 'danger';
 const Icon = isDanger ? AlertTriangle : Info;

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
 <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onCancel} />
 
 <div className="relative bg-white rounded-lg max-w-md w-full border border-slate-200 shadow-xl overflow-hidden transform transition-all">
 <div className="px-6 py-6 sm:p-6 sm:flex sm:items-start">
 <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full sm:mx-0 sm:h-10 sm:w-10 ${isDanger ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
 <Icon className="h-6 w-6" aria-hidden="true" />
 </div>
 <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
 <h3 className="text-lg leading-6 font-medium " id="modal-title">
 {title}
 </h3>
 <div className="mt-2">
 <p className="text-sm text-slate-500">
 {message}
 </p>
 </div>
 </div>
 </div>
 
 <div className="bg-white/50 px-6 py-4 border-t border-slate-200 sm:flex sm:flex-row-reverse">
 <button
 type="button"
 className={`w-full inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-base font-medium shadow-sm focus:outline-none sm:ml-3 sm:w-auto sm:text-sm ${
 isDanger ? 'bg-red-600 hover:bg-red-700 focus:ring-2 focus:ring-offset-2 focus:ring-red-500 focus:ring-offset-gray-900' 
 : 'bg-primary hover:bg-primary/90 focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-gray-900'
 }`}
 onClick={onConfirm}
 >
 {confirmLabel}
 </button>
 <button
 type="button"
 className="mt-3 w-full inline-flex justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-base font-medium text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-gray-900 shadow-sm sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
 onClick={onCancel}
 >
 {cancelLabel}
 </button>
 </div>
 </div>
 </div>
 );
}
