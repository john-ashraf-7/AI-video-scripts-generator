import { GalleryItem, getGalleryPage } from "@/api";

interface PageNavigationProps {
  pageNumber: number;
  assignPageNumber: (page: number) => void;
  currentSort: string;
  setFilteredItems: (items: GalleryItem[]) => void;
}

export default function PageNavigation(props: PageNavigationProps) {
  const { pageNumber, assignPageNumber, currentSort, setFilteredItems } = props;

  const handlePrevious = async () => {
    assignPageNumber(Math.max(pageNumber - 1, 1));
    const sorted = await getGalleryPage(pageNumber, 100, currentSort);
    setFilteredItems(sorted.books);
  };

  const handleNext = async () => {
    assignPageNumber(pageNumber + 1);
    const sorted = await getGalleryPage(pageNumber, 100, currentSort);
    setFilteredItems(sorted.books);
  };

  const handleSearch = async (pageNum: number) => {
    assignPageNumber(pageNum);
    const results = await getGalleryPage(pageNumber, 100, currentSort);
    setFilteredItems(results.books);
  };

  return (
    <div className="flex gap-4 py-4 bg-darkBeige rounded-lg w-[50%] mx-auto my-4">
      <span className="px-4 py-2 text-gray-600 font-bold">Page {pageNumber}</span>
      <button className="px-4 py-2 bg-offWhite cursor-pointer hover:bg-gray-200 rounded-md" onClick={handlePrevious}>Previous</button>
      <button className="px-4 py-2 bg-offWhite cursor-pointer hover:bg-gray-200 rounded-md" onClick={handleNext}>Next</button>
      <input className="px-4 py-2 bg-offWhite border border-gray-300 rounded-md" type="number" placeholder="Go to page number" onChange={(e) => handleSearch(Number(e.target.value))} />
    </div>
  );
}
