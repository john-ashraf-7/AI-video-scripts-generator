import {GalleryItem, getSingleBook} from '../../../api'
import DetailsCard from '../../components/DetailsCard'

interface PageProps {
  params: Promise<{id: string}>;
  searchParams: Promise<{[key: string]: string | string[] | undefined}>;
}

export default async function Page({params, searchParams}: PageProps) {
  const { id } = await params;
  const searchParamsObj = await searchParams;
  const record: GalleryItem = await getSingleBook(id);
  
  return (
    <div>
        <DetailsCard 
          record={record} 
          itemId={id}
          searchParams={searchParamsObj}
        />
    </div>
  )
}
