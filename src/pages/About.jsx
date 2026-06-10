import { Link } from "react-router-dom";
import {
  BarChart3,
  Bell,
  Heart,
  MessageCircle,
  PackageCheck,
  Search,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";

const marketplaceFeatures = [
  {
    icon: ShoppingBag,
    title: "Buy and sell products",
    description:
      "Sellify Marketplace connects buyers and sellers through active product listings, clear product details, and simple marketplace browsing.",
  },
  {
    icon: PackageCheck,
    title: "Post seller listings",
    description:
      "Sellers can create listings with photos, prices, categories, stock information, location details, and descriptions buyers can understand quickly.",
  },
  {
    icon: Search,
    title: "Browse and search",
    description:
      "Buyers can explore listings, search by product details, filter categories, compare prices, and find items that match what they need.",
  },
  {
    icon: Heart,
    title: "Favorite products",
    description:
      "Favorite tools help buyers save interesting products and return to them later without losing track of good marketplace finds.",
  },
  {
    icon: MessageCircle,
    title: "Chat with sellers",
    description:
      "Real-time chat lets buyers ask questions, discuss prices, send offers, and confirm important details before making a decision.",
  },
  {
    icon: Bell,
    title: "Real-time notifications",
    description:
      "Sellify keeps users informed with chat and offer notifications so important marketplace activity is easy to notice.",
  },
];

function About() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 px-4 py-8">
      <section className="mx-auto max-w-7xl overflow-hidden rounded-[1.5rem] border border-green-100 bg-white shadow-sm sm:rounded-[2rem]">
        <div className="grid gap-8 bg-gradient-to-r from-green-50 via-white to-green-100 px-5 py-8 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-10 lg:py-12">
          <div className="flex min-w-0 flex-col justify-center">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-green-600">
              About Sellify
            </p>

            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
              A marketplace for buying, selling, and connecting with confidence.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              Sellify Marketplace helps users buy and sell products through a
              clean, mobile-friendly platform built around listings, favorites,
              secure authentication, real-time chat, notifications, sold
              listings, and seller dashboard tools.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/browse"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-green-600 px-5 py-3 font-black text-white transition hover:bg-green-700 sm:w-auto"
              >
                <Search size={18} />
                Browse listings
              </Link>

              <Link
                to="/sell"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-green-600 bg-white px-5 py-3 font-black text-green-700 transition hover:bg-green-50 sm:w-auto"
              >
                <ShoppingBag size={18} />
                Post a listing
              </Link>
            </div>
          </div>

          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <div className="rounded-[1.5rem] border border-green-100 bg-white p-5 shadow-sm">
              <ShieldCheck className="text-green-600" size={30} />
              <h2 className="mt-4 text-xl font-black text-slate-950">
                Firebase authentication
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                User accounts are protected with Firebase authentication, so
                buyers and sellers can sign in before using personal features.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-green-100 bg-white p-5 shadow-sm">
              <BarChart3 className="text-green-600" size={30} />
              <h2 className="mt-4 text-xl font-black text-slate-950">
                Seller dashboard
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Sellers can manage listings, track stock, mark sold products,
                approve offer sales, and review completed marketplace activity.
              </p>
            </div>
          </div>
        </div>

        <div className="px-5 py-8 sm:px-8 lg:px-10">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {marketplaceFeatures.map(({ icon: Icon, title, description }) => (
              <article
                key={title}
                className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-green-200"
              >
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-green-50 text-green-600">
                  <Icon size={24} />
                </div>

                <h2 className="mt-4 text-lg font-black text-slate-950">
                  {title}
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export default About;
