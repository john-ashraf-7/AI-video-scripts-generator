import { Suspense } from 'react';
import GalleryData from './components/GalleryData';
import ClientGallery from './components/ClientGallery';

export default async function Home() {
  // Server-side data fetching
  const initialItems = await GalleryData();

  return (
    <div className="min-h-screen bg-lightBeige">
      <Suspense fallback={
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-calmRed mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading gallery...</p>
        </div>
      }>
        <ClientGallery initialItems={initialItems} />
      </Suspense>
    </div>
  );
}