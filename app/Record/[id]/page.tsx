import {GalleryItem, getSingleBook} from '../../../src/api'
import DetailsCard from '../../components/DetailsCard'

export default async function Page({params}: {params: Promise<{id: string}>}) {
  const { id } = await params;
  const record: GalleryItem = await getSingleBook(id);
  
  return (
    <div>
        <DetailsCard record={record} itemId={id}/>
    </div>
  )
}
