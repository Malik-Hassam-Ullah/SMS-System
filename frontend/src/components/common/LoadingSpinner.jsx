import React from 'react';

export default function LoadingSpinner({ message = 'Loading...', fullScreen = false }) {
 const content = (
 <div className="flex flex-col items-center justify-center gap-3 text-slate-500">
 <div className="w-10 h-10 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
 {message && <p className="text-sm font-medium">{message}</p>}
 </div>
 );

 if (fullScreen) {
 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
 {content}
 </div>
 );
 }

 return (
 <div className="w-full flex items-center justify-center p-8">
 {content}
 </div>
 );
}
