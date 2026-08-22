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
    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-5 sm:mb-6">
      <div className="relative flex-1 min-w-0">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
        </div>
        <input
          type="text"
          className="input pl-9 sm:pl-10 pr-9 w-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl text-sm"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button 
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            onClick={() => setSearchTerm('')}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {filters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center text-slate-500 mr-1 sm:mr-2 text-xs sm:text-sm font-medium">
            <Filter className="h-4 w-4 mr-1.5 text-slate-400" />
            <span>Filters:</span>
          </div>
          {filters.map(filter => (
            <select
              key={filter.key}
              className="select w-full sm:w-auto py-2 pl-3 pr-8 text-xs sm:text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl"
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
              className="text-xs text-slate-500 hover:text-rose-600 font-medium ml-1 sm:ml-2 flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
