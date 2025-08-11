import { getGalleryPage } from '../../api';
export const pageLimit = 100;
export default async function GalleryData() {
  try {
    const records = await getGalleryPage(1, pageLimit, 'name');
    return records.books || [];
  } catch (error) {
    console.error('Failed to load data:', error);
    return [];
  }
}