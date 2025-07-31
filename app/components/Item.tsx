// import { useState } from 'react';
'use client';
export default function Item() {
    // const [isActive, setIsActive] = useState(true);
    
    return(
        <div className="w-64 h-80 p-4 bg-white shadow rounded-lg flex flex-col m-4">
            <div className="flex-1 relative">
                <img 
                    src="https://digitalcollections.aucegypt.edu/iiif/2/p15795coll19:30192/full/730,/0/default.jpg" 
                    alt="Item Image" 
                    className="w-full h-full object-cover rounded"
                />
            </div>
            <button className="mt-auto w-full bg-blue-600 text-white text-sm py-2 rounded hover:bg-blue-700 transition"
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