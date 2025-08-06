import Item from './components/Item';
import GenerateButton from './components/GenerateButton';
import {getGalleryPage, GalleryItem} from '../src/api';

export default async function Home() {
  const records = await getGalleryPage(1, 100);



  // const [selectedItemCount, setSelectedItemCount] = useState(0);

  // const IncrementSelectedItem = () => {
  //   setSelectedItemCount(selectedItemCount + 1);
  // };

  return (
    <div>
      <h1>Welcome to the AI Video Script Generator</h1>
      <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
        {records.books.map((item: GalleryItem) => (
          <Item key={item.id} item={item}/> 
        ))}
      </div>
      <GenerateButton />
    </div>
  );
}