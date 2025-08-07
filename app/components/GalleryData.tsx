import { getGalleryPage } from '../../src/api';

export default async function GalleryData() {
  try {
    const records = await getGalleryPage(1, 100);
    return records.books || [];
  } catch (error) {
    console.error('Failed to load data:', error);
    return [];
  }
} 