'use client'
import { GalleryItem, getGalleryPage } from "@/api";
import { useState } from "react";
import {pageLimit} from "./GalleryData";

interface PageNavigationProps {
  pageNumber: number;
  onPageChange: (page: number) => void;
}

export default function PageNavigation({ pageNumber, onPageChange}: PageNavigationProps) {
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState(""); // <-- state for search input

  const handlePrevious = () => {
    setInputValue("");
    setLoading(true);
    onPageChange(Math.max(pageNumber - 1, 1));
    setLoading(false);
  };

  const handleNext =  () => {
    setInputValue("");
    setLoading(true);
    onPageChange(pageNumber + 1);
    setLoading(false);
  };

  const handleSearch = async (pageNum: number) => {
    setLoading(true);
    onPageChange(pageNum);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-calmRed mx-auto"></div>
        <span className="ml-4 text-calmRed">Loading...</span>
      </div>
    );
  }

  return (
  <div className="bg-darkBeige py-6 px-20 rounded-xl shadow-lg flex flex-col h-full w-full justify-between items-center">
    <div className="flex items-center gap-3">
      <button
        className="cursor-pointer px-4 py-2 font-semibold text-gray-800 bg-lightBeige border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-calmRed"
        onClick={handlePrevious}
      >
        &lt;
      </button>

      <span className="px-3 py-2 text-gray-600 font-bold">
        Page {pageNumber}
      </span>

      <button
        className="cursor-pointer px-4 py-2 font-semibold text-gray-800 bg-lightBeige border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-calmRed"
        onClick={handleNext}
      >
        &gt;
      </button>
    </div>
    <div className="h-full w-full flex items-center justify-center">
      <img 
        src="/websiteLayout.png"
        alt="a website layout"
        className="object-contain h-full max-h-[130px]"
      />
    </div>
    <div className="flex items-center gap-3">
      <input
        type="number"
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        placeholder="Page #"
        className="px-3 py-2 w-48 font-semibold text-gray-800 bg-lightBeige border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-calmRed"
      />
      <button
        className="cursor-pointer px-4 py-2 font-semibold text-gray-800 bg-lightBeige border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-calmRed"
        onClick={() => handleSearch(Number(inputValue))}
      >
        Go
      </button>
    </div>

  </div>
);

}
