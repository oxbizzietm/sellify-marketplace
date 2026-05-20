import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Camera,
  Heart,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Tag,
} from "lucide-react";
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { db } from "../firebase/firebase";
import { useAuth } from "../context/AuthContext";
import {
  formatListingPrice,
  getListingImage,
  getListingStock,
} from "../utils/listings";

function getSpecChips(product) {
  const chips = [
    product.brand || product.make || product.breed,
    product.model,
    product.year,
    product.storage || product.size,
    product.bedrooms ? `${product.bedrooms} bed` : "",
    product.bathrooms ? `${product.bathrooms} bath` : "",
  ];

  return chips
    .map((chip) => String(chip || "").trim())
    .filter(Boolean)
    .slice(0, 3);
}

function ProductCard({ product }) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [isFavorite, setIsFavorite] = useState(false);
  const [pop, setPop] = useState(false);

  const productImage = getListingImage(product);
  const imageCount = product.images?.length || (product.imageUrl ? 1 : 0);
  const specChips = getSpecChips(product);
  const stock = getListingStock(product);

  useEffect(() => {
    async function checkFavorite() {
      if (!currentUser || !product?.id) {
        setIsFavorite(false);
        return;
      }

      try {
        const favRef = doc(
          db,
          "users",
          currentUser.uid,
          "favorites",
          product.id
        );

        const favSnap = await getDoc(favRef);
        setIsFavorite(favSnap.exists());
      } catch (err) {
        console.error("Favorite check error:", err);
      }
    }

    checkFavorite();
  }, [currentUser, product?.id]);

  async function toggleFavorite(event) {
    event.preventDefault();
    event.stopPropagation();

    if (!currentUser) {
      navigate("/login");
      return;
    }

    try {
      const favRef = doc(
        db,
        "users",
        currentUser.uid,
        "favorites",
        product.id
      );

      if (isFavorite) {
        await deleteDoc(favRef);
        setIsFavorite(false);
      } else {
        await setDoc(favRef, {
          ...product,
          productId: product.id,
          savedAt: serverTimestamp(),
        });

        setIsFavorite(true);
        setPop(true);

        setTimeout(() => {
          setPop(false);
        }, 250);
      }
    } catch (err) {
      console.error("Favorite update error:", err);
    }
  }

  function handleImageError(event) {
    event.currentTarget.src = "https://placehold.co/800x600?text=Sellify";
  }

  return (
    <Link to={`/product/${product.id}`} className="group block h-full">
      <article className="flex h-full flex-col overflow-hidden rounded-[1.7rem] border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-100">
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
          <img
            src={productImage}
            alt={product.title || "Product image"}
            onError={handleImageError}
            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-slate-950/15" />

          <div className="absolute left-3 top-3 flex max-w-[calc(100%-4.5rem)] flex-wrap gap-2">
            <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-white/95 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-emerald-700 shadow-sm backdrop-blur">
              <Tag size={12} />
              <span className="truncate">{product.category || "General"}</span>
            </span>

            {imageCount > 1 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-950/70 px-3 py-1 text-[11px] font-black text-white backdrop-blur">
                <Camera size={12} />
                {imageCount}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={toggleFavorite}
            className={`absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/95 shadow-sm backdrop-blur transition-all duration-200 hover:bg-red-50 ${
              isFavorite ? "text-red-500" : "text-slate-700 hover:text-red-500"
            } ${pop ? "scale-125" : "scale-100"}`}
            title={isFavorite ? "Remove from favourites" : "Add to favourites"}
          >
            <Heart
              size={18}
              fill={isFavorite ? "currentColor" : "none"}
              className="transition-all duration-200"
            />
          </button>

          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
            <span className="min-w-0 truncate rounded-full bg-white/95 px-3 py-1 text-[11px] font-black text-slate-700 shadow-sm backdrop-blur">
              {stock <= 0 ? "Out of stock" : product.condition || "Available"}
            </span>

            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-black text-white shadow-sm">
              <ShieldCheck size={13} />
              Verified
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-col p-4">
          <h3 className="line-clamp-2 min-h-[3.5rem] text-lg font-black leading-7 text-slate-950 transition group-hover:text-emerald-700">
            {product.title || "Untitled Product"}
          </h3>

          <p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">
            {product.description ||
              "Quality item listed on Sellify marketplace."}
          </p>

          {specChips.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {specChips.map((chip) => (
                <span
                  key={chip}
                  className="max-w-full truncate rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600"
                >
                  {chip}
                </span>
              ))}
            </div>
          )}

          <div className="mt-auto">
            <p className="mt-4 text-2xl font-black tracking-tight text-emerald-600">
              {formatListingPrice(product.price)}
            </p>

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
              <span className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-slate-500">
                <MapPin size={14} className="shrink-0" />
                <span className="truncate">
                  {product.location || "Nigeria"}
                </span>
              </span>

              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">
                <MessageCircle size={14} />
                Chat
              </span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}

export default ProductCard;
