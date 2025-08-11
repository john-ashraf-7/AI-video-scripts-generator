import { GalleryItem, getGalleryPage } from "@/api";
import { useState } from "react";

interface PageNavigationProps {
  pageNumber: number;
  assignPageNumber: (page: number) => void;
  currentSort: string;
  setFilteredItems: (items: GalleryItem[]) => void;
}

export default function PageNavigation(props: PageNavigationProps) {
  const { pageNumber, assignPageNumber, currentSort, setFilteredItems } = props;
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState(""); // <-- state for search input

  const handlePrevious = async () => {
    if (pageNumber == 1) {
      // Error handling block: already at first page
      alert("You are already on the first page.");
      return;
    }
    setInputValue("");
    setLoading(true);
    assignPageNumber(Math.max(pageNumber - 1, 1));
    const sorted = await getGalleryPage(pageNumber - 1, 100, currentSort);
    setFilteredItems(sorted.books);
    setLoading(false);
  };

  const handleNext = async () => {
    setInputValue("");
    setLoading(true);
    assignPageNumber(pageNumber + 1);
    const sorted = await getGalleryPage(pageNumber + 1, 100, currentSort);
    setFilteredItems(sorted.books);
    setLoading(false);
  };

  const handleSearch = async (pageNum: number) => {
    setLoading(true);
    assignPageNumber(pageNum);
    const results = await getGalleryPage(pageNum, 100, currentSort);
    setFilteredItems(results.books);
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
  <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-darkBeige rounded-lg w-full md:w-1/2 p-4 mx-auto min-h-[100px] mb-4">
    
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
