export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-100 p-8 mt-12">
      <div className="container mx-auto text-center">
        <p className="text-gray-600">
          © {currentYear} monogs. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
