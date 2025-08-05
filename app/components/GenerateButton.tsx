export default function GenerateButton(props: any) {
    return (
        <button className={`bg-calmRed text-white px-4 py-2 rounded hover:shadow-2xl transition duration-200 ${props.className}`}>
            {props.itemscount}
        </button>
    )
}