import Link from 'next/link';
import Image from 'next/image';

export default function Header() {
  return (
    <header className="bg-calmRed text-white shadow">
      <nav className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold">
          <Image
            src="/favicon.ico"
            alt="Logo: Stacked books"
            width={80}
            height={80}
            className="inline-block mr-2"
          />
          AI-video-scripts-generator
        </Link>
        {/* You can add more navigation links here */}
      </nav>
    </header>
  );
}