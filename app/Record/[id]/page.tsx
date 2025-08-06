import {GalleryItem, getSingleBook} from '../../../src/api'
import DetailsCard from '../../components/DetailsCard'

export default async function Page({params}: {params: {id: string}}) {
  const record: GalleryItem = await getSingleBook(params.id);
  
  return (
    <div>
        <DetailsCard record={record}/>
    </div>
  )
}
