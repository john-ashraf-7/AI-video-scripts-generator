export default function Footer() {
  return (
    <footer className="bg-calmRed text-white p-4 shadow">
      <div className="container mx-auto text-center">
      <p className="text-sm">
          © {new Date().getFullYear()} Digital Collections Library AI Script Generator. 
          Developed as part of the AUC Library Internship Program (Summer 2025).
        </p>
        <div className="mt-2 text-xs text-gray-400">
          Powered by Ollama + Llama3.2:8B | Helsinki-NLP Translation Models
        </div>
      </div>
    </footer>
  );
}