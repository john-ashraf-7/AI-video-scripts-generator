'use client';

import { useState } from 'react';

interface SearchAndFilterProps {
  onSearchChange: (query: string) => void;
  onFilterChange: (filter: string) => void;
  onSortChange: (sort: string) => void;
  onClearFilters: () => void;
}

export default function SearchAndFilter({
  onSearchChange,
  onFilterChange,
  onSortChange,
  onClearFilters
}: SearchAndFilterProps) {
  const [currentSearchQuery, setCurrentSearchQuery] = useState('');
  const [currentSearchFilter, setCurrentSearchFilter] = useState('all');
  const [currentSortBy, setSortBy] = useState('Title');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setCurrentSearchQuery(query);
    onSearchChange(query); //this is where the search query is passed to the parent component
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const filter = e.target.value;
    setCurrentSearchFilter(filter);
    onFilterChange(filter);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sort = e.target.value;
    setSortBy(sort);
    onSortChange(sort);
  };

  const handleClearFilters = () => {
    setCurrentSearchQuery('');
    setCurrentSearchFilter('all');
    setSortBy('name');
    onClearFilters();
  };

  const handleApplyFilters = () => {
    onSearchChange(currentSearchQuery);
    onFilterChange(currentSearchFilter);
    onSortChange(currentSortBy);
  };

  return (
    <div className="bg-darkBeige p-6 rounded-xl shadow-lg mb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search Input */}
        <div>
          <label className="font-semibold text-gray-800 text-md line-clamp-2 leading-tight mb-2">
            Search
          </label>
          <input
            type="text"
            value={currentSearchQuery}
            onChange={handleSearchChange}
            placeholder="Search items..."
            className="w-full px-3 py-2 border border-gray-300 bg-lightBeige rounded-lg focus:outline-none focus:ring-2 focus:ring-calmRed focus:border-transparent font-semibold text-gray-800 text-md line-clamp-2 leading-tight"
          />
        </div>

        {/* Search Filter */}
        <div>
          <label className="font-semibold text-gray-800 text-md line-clamp-2 leading-tight mb-2">
            Search In
          </label>
          <div className="relative">
            <select
              value={currentSearchFilter}
              onChange={handleFilterChange}
              className="w-full bg-lightBeige font-semibold text-gray-800 text-md line-clamp-2 leading-tight px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-calmRed focus:border-transparent appearance-none cursor-pointer"
            >
              <option value="all">All Fields</option>
              <option value="title">Title</option>
              <option value="creator">Creator</option>
              <option value="call_number">Call Number</option>
              <option value="date">Date</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Sort */}
        <div>
          <label className="font-semibold text-gray-800 text-md line-clamp-2 leading-tight mb-2">
            Sort By
          </label>
          <div className="relative">
            <select
              value={currentSortBy}
              onChange={handleSortChange}
              className="w-full bg-lightBeige font-semibold text-gray-800 text-md line-clamp-2 leading-tight px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-calmRed focus:border-transparent appearance-none cursor-pointer"
            >
              <option value="name">Title A-Z</option>
              <option value="creator">Creator A-Z</option>
              <option value="year">Year (Oldest First)</option>
              <option value="year_desc">Year (Newest First)</option>
            </select>
          </div>
        </div>

        {/* Clear & apply Filters */}
        <div className="flex flex-row gap-4">
          <div className="flex justify-center items-center">
            <label className="text-sm font-medium text-gray-700">
              &nbsp;
            </label>
            <button
              onClick={handleClearFilters}
              className="w-full font-semibold text-gray-800 text-md line-clamp-2 leading-tight cursor-pointer px-4 py-2 bg-lightBeige text-darkBeige rounded-lg hover:shadow-lg transition-colors"
            >
              Clear Filters
            </button>
          </div>
          <div className="flex justify-center items-center">
            <label className="text-sm font-medium text-gray-700">
              &nbsp;
            </label>
            <button
              onClick={handleApplyFilters}
              className="w-full font-semibold text-gray-800 text-md line-clamp-2 leading-tight cursor-pointer px-4 py-2 bg-lightBeige text-darkBeige rounded-lg hover:shadow-lg transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 