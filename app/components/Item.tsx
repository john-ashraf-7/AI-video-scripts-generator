'use client';
// import { useState } from 'react';
import Link from 'next/link';
import {GalleryItem} from '../../src/api';

export default function Item({item}: {item: GalleryItem}) {
    // const [isActive, setIsActive] = useState(true);
    let ImageURL = item['Image URL'];
    if (item.Title.includes("أغنية")) {
        ImageURL="/songs.png"
    }
    
    
    return(
        <div className="w-90 h-120 p-4 bg-darkBeige shadow rounded-lg flex flex-col m-4 hover:">
            <div className="relative group overflow-hidden shadow-lg cursor-pointer flex-1 min-h-0 mx-4">
                <img 
                    src={ImageURL}    
                    alt="Item Image" 
                    className="w-full h-full object-contain rounded"
                />
                <Link href={`/Record/${item._id}`} className="absolute rounded inset-0 bg-black opacity-0 group-hover:opacity-50 transition duration-300 flex items-center justify-center">
                    <span className="text-white text-lg font-semibold opacity-0 group-hover:opacity-100 transition duration-300">More Details</span>
                </Link>
            </div>
            <div className="flex-shrink-0 p-2">
                <h2 className="text-lg font-semibold">{item.Title}</h2>
            </div>
            <button className="cursor-pointer flex-shrink-0 w-full bg-lightBeige text-black text-sm py-2 rounded hover:bg-offWhite transition"
            onClick={() => {
                // if (isActive) {
                //     onSelect(1); // Increment the selected item count
                //     setIsActive(false); // Disable further selection
                // }
                // else {
                //     alert("Item already selected");
                // }
                console.log("Item selected");
            }}>
                Select Item
            </button>
        </div>
    )
}