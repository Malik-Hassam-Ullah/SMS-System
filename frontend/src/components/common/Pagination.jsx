import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, totalPages, onPageChange }) {
 if (totalPages <= 1) return null;

 const handlePageChange = (newPage) => {
 if (newPage >= 1 && newPage <= totalPages) {
 onPageChange(newPage);
 }
 };

 const renderPageNumbers = () => {
 const pages = [];
 const maxVisiblePages = 7;
 
 if (totalPages <= maxVisiblePages) {
 for (let i = 1; i <= totalPages; i++) {
 pages.push(i);
 }
 } else {
 let start = Math.max(1, page - 2);
 let end = Math.min(totalPages, page + 2);

 if (start === 1) {
 end = maxVisiblePages - 2;
 } else if (end === totalPages) {
 start = totalPages - (maxVisiblePages - 3);
 }

 if (start > 1) {
 pages.push(1);
 if (start > 2) pages.push('...');
 }

 for (let i = start; i <= end; i++) {
 pages.push(i);
 }

 if (end < totalPages) {
 if (end < totalPages - 1) pages.push('...');
 pages.push(totalPages);
 }
 }

 return pages.map((p, index) => {
 if (p === '...') {
 return (
 <span key={`ellipsis-${index}`} className="px-3 py-2 text-slate-400">
 ...
 </span>
 );
 }
 return (
 <button
 key={p}
 onClick={() => handlePageChange(p)}
 className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
 page === p 
 ? 'bg-primary ' 
 : 'text-slate-500 hover:bg-white hover:'
 }`}
 >
 {p}
 </button>
 );
 });
 };

 return (
 <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 sm:px-6">
 <div className="flex flex-1 justify-between sm:hidden">
 <button
 onClick={() => handlePageChange(page - 1)}
 disabled={page === 1}
 className="btn-outline btn-sm"
 >
 Previous
 </button>
 <button
 onClick={() => handlePageChange(page + 1)}
 disabled={page === totalPages}
 className="btn-outline btn-sm"
 >
 Next
 </button>
 </div>
 <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
 <div>
 <p className="text-sm text-slate-500">
 Showing page <span className="font-medium ">{page}</span> of <span className="font-medium ">{totalPages}</span>
 </p>
 </div>
 <div>
 <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm gap-1" aria-label="Pagination">
 <button
 onClick={() => handlePageChange(page - 1)}
 disabled={page === 1}
 className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-500 hover:bg-white disabled:opacity-50 disabled:hover:bg-transparent"
 >
 <span className="sr-only">Previous</span>
 <ChevronLeft className="h-5 w-5" aria-hidden="true" />
 </button>
 {renderPageNumbers()}
 <button
 onClick={() => handlePageChange(page + 1)}
 disabled={page === totalPages}
 className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-500 hover:bg-white disabled:opacity-50 disabled:hover:bg-transparent"
 >
 <span className="sr-only">Next</span>
 <ChevronRight className="h-5 w-5" aria-hidden="true" />
 </button>
 </nav>
 </div>
 </div>
 </div>
 );
}
