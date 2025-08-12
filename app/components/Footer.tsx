export default function Footer() {
  return (
    <footer className="bg-calmRed text-offWhite p-4 shadow">
      <div className="container mx-auto text-center">
      <p className="text-md font-bold">
          © {new Date().getFullYear()} AI-Driven Library metadata script generator. 
          Developed as part of the AUC Library Internship Program (Summer 2025).
        </p>
        <div className="mt-2 text-sm text-offWhite font-bold">
          Powered by Ollama + Llama3.2:8B | Helsinki-NLP Translation Models
        </div>
      </div>
    </footer>
  );
}