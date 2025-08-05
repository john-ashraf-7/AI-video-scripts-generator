import Item from './components/Item';
import GenerateButton from './components/GenerateButton';

export default async function Home() {
  const response = await fetch("https://jsonplaceholder.typicode.com/albums")
  if(!response.ok)
  {throw new Error("Failed to fetch albums")}
  const items = await response.json();

  // const [selectedItemCount, setSelectedItemCount] = useState(0);

  // const IncrementSelectedItem = () => {
  //   setSelectedItemCount(selectedItemCount + 1);
  // };

  return (
    <div>
      <h1>Welcome to the AI Video Script Generator</h1>
      <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
        {items.map((item: {id:number}) => (
          <Item key={item.id} />
        ))}
      </div>
      <GenerateButton />
    </div>
  );
}