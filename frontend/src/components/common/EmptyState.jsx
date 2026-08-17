import React from 'react';
import { Search } from 'lucide-react';

export default function EmptyState({ 
 icon: Icon = Search, 
 title = 'No results found', 
 description = 'Try adjusting your search or filters to find what you are looking for.',
 actionLabel,
 onAction
}) {
 return (
 <div className="w-full flex flex-col items-center justify-center p-12 text-center bg-white/50 rounded-lg border border-slate-200">
 <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4">
 <Icon className="w-8 h-8 text-slate-500" />
 </div>
 <h3 className="text-lg font-semibold mb-2">{title}</h3>
 <p className="text-slate-500 max-w-sm mb-6">{description}</p>
 {actionLabel && onAction && (
 <button onClick={onAction} className="btn-primary">
 {actionLabel}
 </button>
 )}
 </div>
 );
}
