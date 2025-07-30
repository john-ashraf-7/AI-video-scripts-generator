'use client';
import Item from './components/Item';
import GenerateButton from './components/GenerateButton';

import { useState } from 'react';

export default function Home() {
  const [selectedItemCount, setSelectedItemCount] = useState(0);

  const IncrementSelectedItem = () => {
    setSelectedItemCount(selectedItemCount + 1);
  };

  return (
    <div>
      <h1>Welcome to the AI Video Script Generator</h1>
      <div className="flex flex-wrap justify-center">
        <Item onSelect={IncrementSelectedItem} />
        <Item onSelect={IncrementSelectedItem} /> 
        <Item onSelect={IncrementSelectedItem} />
      </div>
      <GenerateButton className="" itemscount={selectedItemCount} />
    </div>
  );
}