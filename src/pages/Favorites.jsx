import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  collection,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";

import { Heart } from "lucide-react";

import { db } from "../firebase/firebase";
import { useAuth } from "../context/AuthContext";

import ProductCard from "../components/ProductCard";

function Favorites() {
  const { currentUser } = useAuth();

  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFavorites() {
      if (!currentUser) {
        setFavorites([]);
        setLoading(false);
        return;
      }

      try {
        const favQuery = query(
          collection(
            db,
            "users",
            currentUser.uid,
            "favorites"
          ),
          orderBy("savedAt", "desc")
        );

        const snap = await getDocs(favQuery);

        const favs = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setFavorites(favs);
      } catch (err) {
        console.error("Favorites fetch error:", err);
      }

      setLoading(false);
    }

    fetchFavorites();
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center overflow-x-hidden bg-slate-50 px-4 text-center">
        <div className="rounded-full bg-red-100 p-5">
          <Heart size={40} className="text-red-500" />
        </div>

        <h1 className="mt-6 text-3xl font-black text-slate-900">
          Login to view favourites
        </h1>

        <p className="mt-3 max-w-md text-slate-500">
          Save products you love and access them anytime from your account.
        </p>

        <Link
          to="/login"
          className="mt-6 rounded-2xl bg-green-600 px-7 py-4 font-black text-white transition hover:bg-green-700"
        >
          Login
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-14 w-14 animate-spin rounded-full border-4 border-green-200 border-t-green-600" />
      </div>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-red-500">
              Your collection
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Favourite listings
            </h1>

            <p className="mt-2 text-slate-500">
              {favorites.length} saved item
              {favorites.length !== 1 && "s"}
            </p>
          </div>
        </div>

        {/* EMPTY */}
        {favorites.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-6 py-20 text-center">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-red-100">
              <Heart size={38} className="text-red-500" />
            </div>

            <h2 className="mt-6 text-3xl font-black text-slate-900">
              No favourites yet
            </h2>

            <p className="mx-auto mt-3 max-w-md text-slate-500">
              Tap the heart icon on any listing to save it here.
            </p>

            <Link
              to="/browse"
              className="mt-7 inline-block rounded-2xl bg-green-600 px-7 py-4 font-black text-white transition hover:bg-green-700"
            >
              Browse listings
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {favorites.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default Favorites;
