import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import {
  db,
} from "../firebase/firebase";

import {
  doc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setError("");
      setLoading(true);

      const usernameQ = query(
        collection(db, "users"),
        where("username", "==", username.toLowerCase())
      );

      const usernameSnap = await getDocs(usernameQ);

      if (!usernameSnap.empty) {
        setError("Username is already taken.");
        setLoading(false);
        return;
      }

      const result = await register(email, password);

      await setDoc(doc(db, "users", result.user.uid), {
        name,
        username: username.toLowerCase(),
        email,
        phone,
        photoUrl: "",
        createdAt: new Date(),
      });

      navigate("/");
    } catch {
      setError("Failed to create account.");
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
            Create account
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Join Sellify and start buying or selling instantly.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Full name
            </label>

            <input
              type="text"
              placeholder="e.g Abubakar Musa"
              className="w-full rounded-2xl border border-slate-300 px-5 py-4 outline-none transition focus:border-green-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Username
            </label>

            <div className="relative">
              <span className="absolute left-5 top-4 font-bold text-slate-400">
                @
              </span>

              <input
                type="text"
                placeholder="e.g abubakar123"
                className="w-full rounded-2xl border border-slate-300 py-4 pl-10 pr-5 outline-none transition focus:border-green-500"
                value={username}
                onChange={(e) =>
                  setUsername(
                    e.target.value
                      .replace(/\s/g, "")
                      .toLowerCase()
                  )
                }
                required
              />
            </div>

            <p className="mt-2 text-xs text-slate-400">
              Unique username — no spaces allowed
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Email
            </label>

            <input
              type="email"
              placeholder="e.g abubakar@gmail.com"
              className="w-full rounded-2xl border border-slate-300 px-5 py-4 outline-none transition focus:border-green-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Phone number
            </label>

            <input
              type="tel"
              placeholder="e.g 08012345678"
              className="w-full rounded-2xl border border-slate-300 px-5 py-4 outline-none transition focus:border-green-500"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Password
            </label>

            <input
              type="password"
              placeholder="At least 6 characters"
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
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-bold text-green-600 hover:underline"
          >
            Login
          </Link>
        </p>
      </div>
    </main>
  );
}

export default Register;