export default function Footer() {
  return (
    <footer className="bg-calmRed text-white p-4 shadow">
      <div className="container mx-auto text-center">
        © {new Date().getFullYear()} AI-video-scripts-generator. All rights reserved.
      </div>
    </footer>
  );
}