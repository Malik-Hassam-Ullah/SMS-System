import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, X } from 'lucide-react';

export default function SearchFilter({ 
 onSearch, 
 placeholder = "Search...", 
 filters = [], 
 onFilter 
}) {
 const [searchTerm, setSearchTerm] = useState('');
 const [activeFilters, setActiveFilters] = useState({});

 useEffect(() => {
 const timer = setTimeout(() => {
 onSearch(searchTerm);
 }, 300);
 return () => clearTimeout(timer);
 }, [searchTerm, onSearch]);

 const handleFilterChange = (key, value) => {
 const newFilters = { ...activeFilters, [key]: value };
 if (!value) delete newFilters[key];
 setActiveFilters(newFilters);
 if (onFilter) onFilter(newFilters);
 };

 const clearFilters = () => {
 setActiveFilters({});
 if (onFilter) onFilter({});
 };

 return (
 <div className="flex flex-col sm:flex-row gap-4 mb-6">
 <div className="relative flex-1">
 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
 <Search className="h-5 w-5 text-slate-500" />
 </div>
 <input
 type="text"
 className="input pl-10 w-full"
 placeholder={placeholder}
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 />
 {searchTerm && (
 <button 
 className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:"
 onClick={() => setSearchTerm('')}
 >
 <X className="h-4 w-4" />
 </button>
 )}
 </div>

 {filters.length > 0 && (
 <div className="flex flex-wrap items-center gap-2">
 <div className="flex items-center text-slate-500 mr-2">
 <Filter className="h-5 w-5 mr-2" />
 <span className="text-sm">Filters:</span>
 </div>
 {filters.map(filter => (
 <select
 key={filter.key}
 className="select w-auto py-2 pl-3 pr-8 text-sm bg-white border-slate-200"
 value={activeFilters[filter.key] || ''}
 onChange={(e) => handleFilterChange(filter.key, e.target.value)}
 >
 <option value="">All {filter.label}</option>
 {filter.options.map(opt => (
 <option key={opt.value} value={opt.value}>{opt.label}</option>
 ))}
 </select>
 ))}
 {Object.keys(activeFilters).length > 0 && (
 <button
 onClick={clearFilters}
 className="text-xs text-slate-500 hover: ml-2 flex items-center"
 >
 <X className="w-3 h-3 mr-1" /> Clear
 </button>
 )}
 </div>
 )}
 </div>
 );
}
