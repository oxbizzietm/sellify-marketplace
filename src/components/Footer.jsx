import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer className="overflow-x-hidden border-t border-slate-200 bg-white">
      <div className="page-shell py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-black text-emerald-700">Sellify</p>
            <p className="text-sm text-slate-500">
              Buy smarter. Sell faster. Connect safely.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 text-sm font-semibold text-slate-500">
            <Link to="/about" className="transition hover:text-green-600">
              About
            </Link>
            <Link to="/contact" className="transition hover:text-green-600">
              Contact
            </Link>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-200 pt-4 text-center text-sm text-slate-500">
          &copy; 2026 Group K. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

export default Footer;
