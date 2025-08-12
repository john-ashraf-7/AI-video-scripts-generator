import { getGalleryPage } from '../../api';
export const pageLimit = 100;
export default async function GalleryData() {
  try {
    //this handles the first fetch ever
    const records = await getGalleryPage({ page: 1, limit: pageLimit , sort: "Title A-Z", searchQuery: "", searchIn: "All Fields" });
    return records.books || [];
  } catch (error) {
    console.error('Failed to load data:', error);
    return [];
  }
}