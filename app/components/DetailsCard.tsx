import { GalleryItem } from "@/src/api";
import { useRouter } from 'next/navigation';

export default function DetailsCard({record}: {record: GalleryItem}){
    const router = useRouter();
    
    //the below logic is made to load song images on records because they dont have an Image URL key-value pair in the json object.
    let ImageURL = record['Image URL'];
    if (record.Title.includes("أغنية")) {
        ImageURL="/songs.png"
    }

    return(
        <div className="flex justify-center items-center min-h-screen p-4">
            <div className="bg-white rounded-lg shadow-lg p-12 max-w-2xl w-full text-center relative" style={{backgroundColor: 'var(--color-offWhite)', border: '2px solid var(--color-darkBeige)'}}>
                <button 
                    onClick={() => router.back()}
                    className="absolute top-6 left-6 px-4 py-2 rounded-full font-semibold text-sm transition-all duration-200 hover:scale-105 shadow-md flex items-center gap-2 cursor-pointer"
                    style={{backgroundColor: 'var(--color-calmRed)', color: 'white'}}
                >
                    <span className="text-lg">←</span>
                    Back
                </button>
                <img 
                    src={ImageURL} 
                    alt={record.Title}
                    className="w-64 h-64 object-contain rounded-lg mx-auto mb-8 shadow-md bg-gray-50"
                />
                <h1 className="text-3xl font-bold mb-6" style={{color: 'var(--foreground)'}}>{record.Title}</h1>
                <div className="space-y-4 text-left text-lg">
                    <p className="text-gray-700"><strong>Description:</strong> {record.description}</p>
                    <p className="text-gray-700"><strong>Creator:</strong> {record.creator}</p>
                    <p className="text-gray-700"><strong>Date:</strong> {record.date}</p>
                    <p className="text-gray-700"><strong>Call Number:</strong> {record.call_number}</p>
                </div>
                <button 
                    className="mt-8 px-8 py-3 rounded-lg font-semibold text-lg transition-all duration-200 hover:scale-105 shadow-md cursor-pointer"
                    style={{backgroundColor: 'var(--color-calmRed)', color: 'white'}}
                >
                    Add to selection
                </button>
            </div>
        </div>
    )
}