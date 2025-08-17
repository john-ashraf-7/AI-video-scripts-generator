'use client';

import { useState, useEffect } from 'react';

interface SearchAndFilterProps {
  onFilterChange: (sortBy: string, searchQuery: string, searchFilter: string) => void;
  initialSearchQuery?: string;
  initialSearchFilter?: string;
  initialSortBy?: string;
}

export default function SearchAndFilter({
  onFilterChange,
  initialSearchQuery = "",
  initialSearchFilter = "All Fields",
  initialSortBy = "Title A-Z"
}: SearchAndFilterProps) {
  const [currentSortBy, setSortBy] = useState<string>(initialSortBy);
  const [currentSearchQuery, setCurrentSearchQuery] = useState<string>(initialSearchQuery);
  const [currentSearchFilter, setCurrentSearchFilter] = useState(initialSearchFilter);

  // Update state when initial values change
  useEffect(() => {
    setSortBy(initialSortBy);
    setCurrentSearchQuery(initialSearchQuery);
    setCurrentSearchFilter(initialSearchFilter);
  }, [initialSortBy, initialSearchQuery, initialSearchFilter]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setCurrentSearchQuery(query);
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const filter = e.target.value;
    setCurrentSearchFilter(filter);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sort = e.target.value;
    setSortBy(sort);
  };
  
  const handleClearFilters = () => {
    setSortBy('Title A-Z');
    setCurrentSearchQuery('');
    setCurrentSearchFilter('All Fields');
    onFilterChange('Title A-Z', '', 'All Fields');
  };

  const handleApplyFilters = () => {
    onFilterChange(currentSortBy, currentSearchQuery, currentSearchFilter);
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
              <option value="All Fields">All Fields</option>
              <option value="Title">Title</option>
              <option value="Creator">Creator</option>
              <option value="Call number">Call Number</option>
              <option value="Date">Date</option>
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
              <option value="Title A-Z">Title A-Z</option>
              <option value="Creator A-Z">Creator A-Z</option>
              <option value="Year oldest first">Year oldest first</option>
              <option value="Year newest first">Year newest first</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleApplyFilters}
            className="flex-1 bg-calmRed text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-semibold"
          >
            Apply Filters
          </button>
          <button
            onClick={handleClearFilters}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors font-semibold"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
} 