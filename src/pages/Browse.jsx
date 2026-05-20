import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { collection, getDocs, orderBy, query } from "firebase/firestore";

import ProductCard from "../components/ProductCard";
import { db } from "../firebase/firebase";
import { BROWSE_CATEGORIES } from "../utils/categories";
import { isPublicListing } from "../utils/listings";

const PAGE_SIZE_OPTIONS = [12, 24, 48];

const SORT_OPTIONS = [
  { label: "Newest", value: "newest" },
  { label: "Price: low to high", value: "priceLow" },
  { label: "Price: high to low", value: "priceHigh" },
  { label: "Title A-Z", value: "titleAz" },
];

function getInitialFilters(searchString) {
  const params = new URLSearchParams(searchString);

  return {
    initialSearch: params.get("search") || "",
    initialCategory: params.get("category") || "All",
  };
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function getPrice(product) {
  const price = Number(product.price);
  return Number.isFinite(price) ? price : 0;
}

function getCreatedTime(product) {
  if (typeof product.createdAt?.toMillis === "function") {
    return product.createdAt.toMillis();
  }

  if (product.createdAt?.seconds) {
    return product.createdAt.seconds * 1000;
  }

  const parsedDate = Date.parse(product.createdAt || "");
  return Number.isFinite(parsedDate) ? parsedDate : 0;
}

function getSearchText(product) {
  return [
    product.title,
    product.description,
    product.category,
    product.location,
    product.address,
    product.brand,
    product.model,
    product.make,
    product.breed,
    product.condition,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function getUniqueOptions(products, field) {
  return [
    ...new Set(
      products
        .map((product) => String(product[field] || "").trim())
        .filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b));
}

function Browse() {
  const location = useLocation();
  const { initialSearch, initialCategory } = getInitialFilters(location.search);

  return (
    <BrowseListings
      key={location.search}
      initialSearch={initialSearch}
      initialCategory={initialCategory}
    />
  );
}

function BrowseListings({ initialSearch, initialCategory }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState(initialCategory);
  const [locationFilter, setLocationFilter] = useState("All");
  const [condition, setCondition] = useState("All");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [pageSize, setPageSize] = useState(12);
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const q = query(
          collection(db, "products"),
          orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(q);

        const activeProducts = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter(isPublicListing);

        setProducts(activeProducts);
      } catch (error) {
        console.error("Error fetching products:", error);
      }

      setLoading(false);
    }

    fetchProducts();
  }, []);

  const categoryCounts = useMemo(() => {
    return products.reduce(
      (counts, product) => ({
        ...counts,
        [product.category || "Others"]:
          (counts[product.category || "Others"] || 0) + 1,
      }),
      { All: products.length }
    );
  }, [products]);

  const locationOptions = useMemo(
    () => getUniqueOptions(products, "location"),
    [products]
  );

  const conditionOptions = useMemo(
    () => getUniqueOptions(products, "condition").slice(0, 16),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const searchTerm = normalize(search);
    const minimumPrice = minPrice === "" ? null : Number(minPrice);
    const maximumPrice = maxPrice === "" ? null : Number(maxPrice);

    return products
      .filter((product) => {
        const productPrice = getPrice(product);
        const matchesSearch =
          searchTerm.length === 0 || getSearchText(product).includes(searchTerm);
        const matchesCategory =
          category === "All" ||
          normalize(product.category) === normalize(category);
        const matchesLocation =
          locationFilter === "All" ||
          normalize(product.location) === normalize(locationFilter);
        const matchesCondition =
          condition === "All" ||
          normalize(product.condition) === normalize(condition);
        const matchesMinimum =
          minimumPrice === null ||
          !Number.isFinite(minimumPrice) ||
          productPrice >= minimumPrice;
        const matchesMaximum =
          maximumPrice === null ||
          !Number.isFinite(maximumPrice) ||
          productPrice <= maximumPrice;

        return (
          matchesSearch &&
          matchesCategory &&
          matchesLocation &&
          matchesCondition &&
          matchesMinimum &&
          matchesMaximum
        );
      })
      .sort((a, b) => {
        if (sortBy === "priceLow") return getPrice(a) - getPrice(b);
        if (sortBy === "priceHigh") return getPrice(b) - getPrice(a);
        if (sortBy === "titleAz") {
          return String(a.title || "").localeCompare(String(b.title || ""));
        }

        return getCreatedTime(b) - getCreatedTime(a);
      });
  }, [
    products,
    search,
    category,
    locationFilter,
    condition,
    minPrice,
    maxPrice,
    sortBy,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const firstItemIndex = (currentPage - 1) * pageSize;
  const paginatedProducts = filteredProducts.slice(
    firstItemIndex,
    firstItemIndex + pageSize
  );
  const showingFrom =
    filteredProducts.length === 0 ? 0 : firstItemIndex + 1;
  const showingTo = Math.min(firstItemIndex + pageSize, filteredProducts.length);
  const hasFilters =
    search ||
    category !== "All" ||
    locationFilter !== "All" ||
    condition !== "All" ||
    minPrice ||
    maxPrice;

  function clearFilters() {
    setSearch("");
    setCategory("All");
    setLocationFilter("All");
    setCondition("All");
    setMinPrice("");
    setMaxPrice("");
    setPage(1);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-green-600">
              Marketplace
            </p>

            <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">
              Browse Listings
            </h1>

            <p className="mt-2 text-slate-500">
              {products.length} active listing{products.length !== 1 && "s"} on
              Sellify.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 shadow-sm">
            <SlidersHorizontal size={17} className="text-green-600" />
            {filteredProducts.length} match
            {filteredProducts.length !== 1 && "es"}
          </div>
        </div>

        <section className="mb-6 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[1fr_210px_190px]">
            <label className="relative block">
              <Search
                size={19}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                placeholder="Search products, brands, models, locations..."
                className="h-12 w-full rounded-2xl border border-slate-300 pl-12 pr-4 font-semibold outline-none transition focus:border-green-500"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </label>

            <select
              className="h-12 w-full rounded-2xl border border-slate-300 px-4 font-semibold outline-none transition focus:border-green-500"
              value={sortBy}
              onChange={(event) => {
                setSortBy(event.target.value);
                setPage(1);
              }}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              className="h-12 w-full rounded-2xl border border-slate-300 px-4 font-semibold outline-none transition focus:border-green-500"
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option} per page
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {BROWSE_CATEGORIES.map((cat) => {
              const isActive = category === cat;
              const count = categoryCounts[cat] || 0;

              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setCategory(cat);
                    setPage(1);
                  }}
                  className={`shrink-0 rounded-full border px-4 py-2 text-sm font-black transition ${
                    isActive
                      ? "border-green-600 bg-green-600 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:border-green-200 hover:bg-green-50 hover:text-green-700"
                  }`}
                >
                  {cat}
                  <span
                    className={`ml-2 rounded-full px-2 py-0.5 text-[11px] ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-white text-slate-400"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_150px_150px_auto]">
            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                Location
              </span>

              <select
                className="h-12 w-full rounded-2xl border border-slate-300 px-4 font-semibold text-slate-700 outline-none transition focus:border-green-500"
                value={locationFilter}
                onChange={(event) => {
                  setLocationFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option>All</option>
                {locationOptions.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                Condition
              </span>

              <select
                className="h-12 w-full rounded-2xl border border-slate-300 px-4 font-semibold text-slate-700 outline-none transition focus:border-green-500"
                value={condition}
                onChange={(event) => {
                  setCondition(event.target.value);
                  setPage(1);
                }}
              >
                <option>All</option>
                {conditionOptions.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>

            <input
              type="number"
              min="0"
              placeholder="Min price"
              className="h-12 rounded-2xl border border-slate-300 px-4 font-semibold outline-none transition focus:border-green-500"
              value={minPrice}
              onChange={(event) => {
                setMinPrice(event.target.value);
                setPage(1);
              }}
            />

            <input
              type="number"
              min="0"
              placeholder="Max price"
              className="h-12 rounded-2xl border border-slate-300 px-4 font-semibold outline-none transition focus:border-green-500"
              value={maxPrice}
              onChange={(event) => {
                setMaxPrice(event.target.value);
                setPage(1);
              }}
            />

            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasFilters}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 font-black text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <X size={17} />
              Clear
            </button>
          </div>
        </section>

        <div className="mb-5 flex flex-col gap-3 text-sm font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Showing {showingFrom}-{showingTo} of {filteredProducts.length}{" "}
            listing{filteredProducts.length !== 1 && "s"}
          </p>

          <p>
            Page {currentPage} of {totalPages}
          </p>
        </div>

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {Array.from({ length: 12 }, (_, index) => (
              <div
                key={index}
                className="h-[430px] animate-pulse rounded-[1.7rem] bg-slate-200"
              />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-6 py-20 text-center">
            <h2 className="text-3xl font-black text-slate-900">
              No products found
            </h2>

            <p className="mx-auto mt-3 max-w-md text-slate-500">
              Try a different search, category, or price range.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {paginatedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 font-black text-slate-700 transition hover:border-green-200 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={18} />
                Previous
              </button>

              <div className="flex justify-center gap-2">
                {Array.from({ length: totalPages }, (_, index) => index + 1)
                  .filter(
                    (pageNumber) =>
                      pageNumber === 1 ||
                      pageNumber === totalPages ||
                      Math.abs(pageNumber - currentPage) <= 1
                  )
                  .map((pageNumber, index, visiblePages) => {
                    const previousPage = visiblePages[index - 1];
                    const showGap = previousPage && pageNumber - previousPage > 1;

                    return (
                      <span key={pageNumber} className="flex items-center gap-2">
                        {showGap && (
                          <span className="font-black text-slate-300">...</span>
                        )}

                        <button
                          type="button"
                          onClick={() => setPage(pageNumber)}
                          className={`grid h-11 w-11 place-items-center rounded-2xl text-sm font-black transition ${
                            currentPage === pageNumber
                              ? "bg-green-600 text-white"
                              : "bg-slate-100 text-slate-600 hover:bg-green-50 hover:text-green-700"
                          }`}
                        >
                          {pageNumber}
                        </button>
                      </span>
                    );
                  })}
              </div>

              <button
                type="button"
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                disabled={currentPage === totalPages}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 font-black text-slate-700 transition hover:border-green-200 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight size={18} />
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default Browse;
