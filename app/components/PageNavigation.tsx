import {useState} from 'react';
    
export default function PageNavigation() {
  const [currentPage, setCurrentPage] = useState(1);

  const handlePrevious = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNext = () => {
    setCurrentPage(prev => prev + 1);
  };

  return (
    <div className="flex gap-4 py-4 bg-darkBeige rounded-lg w-[50%] mx-auto my-4">
      <span className="px-4 py-2 text-gray-600 font-bold">Page {currentPage}</span>
      <button className="px-4 py-2 bg-offWhite cursor-pointer hover:bg-gray-200 rounded-md" onClick={handlePrevious}>Previous</button>
      <button className="px-4 py-2 bg-offWhite cursor-pointer hover:bg-gray-200 rounded-md" onClick={handleNext}>Next</button>
      <input className="px-4 py-2 bg-offWhite border border-gray-300 rounded-md" type="number" placeholder="Go to page number" min="1" value={currentPage} onChange={(e) => setCurrentPage(Math.max(1, Number(e.target.value)))} />
    </div>
  );
}
