import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setError("");
      setLoading(true);

      await login(email, password);

      navigate("/");
    } catch {
      setError("Failed to log in. Check your email and password.");
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 flex items-center justify-center">
      <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        
        {/* LOGO */}
        <div className="mb-7 text-center">
          <Link to="/" className="inline-flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-green-600 text-xl font-black text-white shadow-sm">
              S
            </div>

            <div className="text-left leading-none">
              <div className="text-3xl font-black tracking-tight text-black">
                ellify
              </div>

              <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.25em] text-slate-400">
                Marketplace
              </p>
            </div>
          </Link>

          <h2 className="mt-7 text-2xl font-black text-slate-900">
            Welcome back
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Login to continue buying and selling on Sellify.
          </p>
        </div>

        {error && (
          <p className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-600">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Email
            </label>

            <input
              type="email"
              placeholder="e.g. abubakar@gmail.com"
              className="w-full rounded-2xl border border-slate-300 px-5 py-4 outline-none transition focus:border-green-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Password
            </label>

            <input
              type="password"
              placeholder="Your password"
              className="w-full rounded-2xl border border-slate-300 px-5 py-4 outline-none transition focus:border-green-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-green-600 py-4 text-lg font-black text-white transition hover:bg-green-700 disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          Don&apos;t have an account?{" "}
          <Link
            to="/register"
            className="font-bold text-green-600 hover:underline"
          >
            Register
          </Link>
        </p>

        <div className="my-5 flex items-center gap-3">
          <hr className="flex-1 border-slate-200" />
          <span className="text-sm font-semibold text-slate-400">or</span>
          <hr className="flex-1 border-slate-200" />
        </div>

        <Link
          to="/browse"
          className="block rounded-2xl border-2 border-green-600 py-3 text-center text-sm font-black text-green-700 transition hover:bg-green-50"
        >
          Browse without logging in
        </Link>
      </div>
    </main>
  );
}

export default Login;