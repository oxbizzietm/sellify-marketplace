import { useState, useEffect } from "react";
import { db } from "../firebase/firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import ProductCard from "../components/ProductCard";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { isPublicListing } from "../utils/listings";

const heroSlides = [
  {
    tag: "Buy. Sell. Connect.",
    title: "Buy and sell anything in your community",
    highlight: "community",
    description:
      "Join thousands of people using Sellify Marketplace to buy and sell great items near you.",
    image:
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=1600&auto=format&fit=crop",
  },
  {
    tag: "Phones & Gadgets",
    title: "Find phones, laptops and gadgets faster",
    highlight: "gadgets",
    description:
      "Discover affordable electronics from sellers around you and chat before you buy.",
    image:
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=1600&auto=format&fit=crop",
  },
  {
    tag: "Laptop Deals",
    title: "Upgrade your setup without overspending",
    highlight: "setup",
    description:
      "Shop laptops, accessories and tech essentials from verified local sellers.",
    image:
      "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=1600&auto=format&fit=crop",
  },
  {
    tag: "Fashion Finds",
    title: "Shop fashion items without stress",
    highlight: "fashion",
    description:
      "Browse shoes, clothes, bags and accessories from trusted sellers in your area.",
    image:
      "https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=1600&auto=format&fit=crop",
  },
  {
    tag: "Sneakers & Style",
    title: "Find clean sneakers and streetwear deals",
    highlight: "sneakers",
    description:
      "Buy stylish fashion pieces and footwear from people close to you.",
    image:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1600&auto=format&fit=crop",
  },
  {
    tag: "Vehicles",
    title: "Discover cars and auto deals near you",
    highlight: "cars",
    description: "Browse vehicles, parts and accessories from local sellers.",
    image:
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1600&auto=format&fit=crop",
  },
  {
    tag: "Home & Living",
    title: "Upgrade your space with affordable items",
    highlight: "space",
    description:
      "Find furniture, decor, appliances and home essentials for less.",
    image:
      "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=1600&auto=format&fit=crop",
  },
  {
    tag: "Sell Fast",
    title: "Turn unused items into quick cash",
    highlight: "cash",
    description:
      "Upload photos, set your price, and start receiving messages from buyers.",
    image:
      "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=1600&auto=format&fit=crop",
  },
];

function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSlide, setActiveSlide] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchProducts() {
      try {
        const q = query(
          collection(db, "products"),
          orderBy("createdAt", "desc"),
          limit(20)
        );

        const snapshot = await getDocs(q);

        const activeProducts = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter(isPublicListing)
          .slice(0, 5);

        setProducts(activeProducts);
      } catch (error) {
        console.error("Home fetch error:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((current) => (current + 1) % heroSlides.length);
    }, 6000);

    return () => clearInterval(timer);
  }, []);

  const slide = heroSlides[activeSlide];

  const nextSlide = () => {
    setActiveSlide((current) => (current + 1) % heroSlides.length);
  };

  const prevSlide = () => {
    setActiveSlide(
      (current) => (current - 1 + heroSlides.length) % heroSlides.length
    );
  };

  function renderTitle(title, highlight) {
    const parts = title.split(highlight);

    if (parts.length === 1) return title;

    return (
      <>
        {parts[0]}
        <span className="text-green-600">{highlight}</span>
        {parts[1]}
      </>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <section className="px-6 pt-6">
        <div className="relative min-h-[430px] overflow-hidden rounded-[2rem] bg-gradient-to-r from-green-50 via-white to-green-100 shadow-sm">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_30%,rgba(22,163,74,0.18),transparent_35%)]" />

          <div className="relative z-10 grid min-h-[430px] grid-cols-1 lg:grid-cols-2">
            <div className="flex flex-col justify-center px-8 py-12 transition-all duration-700 ease-out lg:px-10">
              <span
                key={slide.tag}
                className="mb-5 w-fit rounded-xl bg-green-100 px-4 py-2 text-sm font-black text-green-700 animate-[fadeIn_0.7s_ease-out]"
              >
                {slide.tag}
              </span>

              <h1
                key={slide.title}
                className="max-w-2xl text-5xl font-black leading-tight tracking-tight text-black animate-[slideUp_0.7s_ease-out] lg:text-6xl"
              >
                {renderTitle(slide.title, slide.highlight)}
              </h1>

              <p
                key={slide.description}
                className="mt-5 max-w-xl text-lg leading-8 text-gray-700 animate-[fadeIn_0.9s_ease-out]"
              >
                {slide.description}
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <button
                  onClick={() => navigate("/browse")}
                  className="rounded-xl bg-green-600 px-8 py-4 text-base font-black text-white shadow-sm transition hover:bg-green-700"
                >
                  Browse Products
                </button>

                <button
                  onClick={() => navigate("/sell")}
                  className="rounded-xl border border-green-600 bg-white px-8 py-4 text-base font-black text-green-700 shadow-sm transition hover:bg-green-50"
                >
                  Sell an Item
                </button>
              </div>

              <div className="mt-8 flex items-center gap-3">
                {heroSlides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveSlide(index)}
                    className={`h-2.5 rounded-full transition-all duration-500 ${
                      activeSlide === index
                        ? "w-9 bg-green-600"
                        : "w-2.5 bg-green-200 hover:bg-green-400"
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            <div className="relative hidden lg:block">
              {heroSlides.map((item, index) => (
                <img
                  key={item.image}
                  src={item.image}
                  alt={item.tag}
                  className={`absolute inset-0 h-full w-full object-cover object-center transition-[opacity,transform] duration-[1400ms] ease-in-out ${
                    activeSlide === index
                      ? "opacity-100 scale-100"
                      : "opacity-0 scale-110"
                  }`}
                />
              ))}

              <div className="absolute inset-0 bg-gradient-to-r from-green-50 via-white/20 to-transparent" />

              <button
                onClick={prevSlide}
                className="absolute left-5 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-gray-900 shadow-lg backdrop-blur transition hover:bg-white"
              >
                <ChevronLeft size={24} />
              </button>

              <button
                onClick={nextSlide}
                className="absolute right-5 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-gray-900 shadow-lg backdrop-blur transition hover:bg-white"
              >
                <ChevronRight size={24} />
              </button>
            </div>
          </div>
        </div>
      </section>

      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(18px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>

      <section className="px-6 py-8">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-black text-black">Featured Listings</h2>

          <button
            onClick={() => navigate("/browse")}
            className="font-bold text-green-600 hover:underline"
          >
            View all
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {[1, 2, 3, 4, 5].map((item) => (
              <div
                key={item}
                className="h-80 animate-pulse rounded-3xl bg-gray-100"
              />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-green-200 bg-green-50 p-12 text-center">
            <h3 className="text-2xl font-black text-gray-900">
              No active listings yet
            </h3>

            <p className="mt-2 text-gray-600">
              Be the first person to post an item on Sellify.
            </p>

            <button
              onClick={() => navigate("/sell")}
              className="mt-6 rounded-xl bg-green-600 px-6 py-3 font-bold text-white hover:bg-green-700"
            >
              Post a Listing
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default Home;
