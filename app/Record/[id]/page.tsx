'use client'
import { useParams } from 'next/navigation'
import {GalleryItem, getSingleBook} from '../../../src/api'
import DetailsCard from '../../components/DetailsCard'

export default async function Page() {
  const params = useParams()
  const _id = params.id;
  const record: GalleryItem = await getSingleBook(_id as string);
  

  return (
    <div>
        <DetailsCard record={record}/>
    </div>
  )
}
