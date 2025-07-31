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
      <div className="flex flex-wrap justify-center">
        {items.map((item: {id:number}) => (
          <Item key={item.id} />
        ))}
      </div>
      <GenerateButton className="" />
    </div>
  );
}