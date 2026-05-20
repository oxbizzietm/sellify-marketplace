import { Link } from "react-router-dom";

function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-9xl font-bold text-green-600">404</h1>
      <h2 className="text-3xl font-bold text-gray-800 mt-4">Page Not Found</h2>
      <p className="text-gray-500 mt-2 mb-8">
        Oops! The page you're looking for doesn't exist.
      </p>
      <Link
        to="/"
        className="bg-green-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-green-700"
      >
        Go Back Home
      </Link>
    </div>
  );
}

export default NotFound;