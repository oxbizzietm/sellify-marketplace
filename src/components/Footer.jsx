function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="page-shell py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-black text-emerald-700">Sellify</p>
            <p className="text-sm text-slate-500">Buy smarter. Sell faster. Connect safely.</p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm font-semibold text-slate-500">
            <span>About</span>
            <span>Contact</span>
            <span>Safety Tips</span>
            <span>Terms</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
