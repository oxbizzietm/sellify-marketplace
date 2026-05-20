import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Archive,
  BarChart3,
  CheckCircle2,
  Edit3,
  Eye,
  Loader2,
  PackageCheck,
  PauseCircle,
  Plus,
  ShoppingBag,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import { useAuth } from "../context/AuthContext";
import { db } from "../firebase/firebase";
import { LISTING_CATEGORIES } from "../utils/categories";
import {
  formatListingPrice,
  getListingImage,
  getListingStatus,
  getListingStock,
  getSalesTotal,
  getUnitsSold,
} from "../utils/listings";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "draft", label: "Draft" },
  { value: "sold", label: "Sold" },
];

const FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "draft", label: "Draft" },
  { value: "sold", label: "Sold" },
  { value: "outOfStock", label: "Out of stock" },
];

const STATUS_META = {
  active: {
    label: "Active",
    Icon: CheckCircle2,
    className: "bg-green-50 text-green-700 ring-green-100",
  },
  paused: {
    label: "Paused",
    Icon: PauseCircle,
    className: "bg-orange-50 text-orange-700 ring-orange-100",
  },
  draft: {
    label: "Draft",
    Icon: Archive,
    className: "bg-slate-100 text-slate-600 ring-slate-200",
  },
  sold: {
    label: "Sold",
    Icon: PackageCheck,
    className: "bg-red-50 text-red-600 ring-red-100",
  },
  outOfStock: {
    label: "Out of stock",
    Icon: AlertTriangle,
    className: "bg-amber-50 text-amber-700 ring-amber-100",
  },
};

function getDashboardStatus(product) {
  const status = getListingStatus(product);

  if (status === "active" && getListingStock(product) <= 0) {
    return "outOfStock";
  }

  return status;
}

function getTimeValue(value) {
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (value?.seconds) return value.seconds * 1000;

  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value) {
  const time = getTimeValue(value);

  if (!time) return "No date";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(time));
}

function getEditForm(product) {
  return {
    title: product.title || "",
    price: String(product.price ?? ""),
    category: product.category || "Others",
    listingStatus: getListingStatus(product),
    stock: String(getListingStock(product)),
    condition: product.condition || "",
    location: product.location || "",
    address: product.address || "",
    phone: product.phone || "",
    description: product.description || "",
    brand: product.brand || "",
    model: product.model || "",
    storage: product.storage || "",
    ram: product.ram || "",
    size: product.size || "",
    gender: product.gender || "",
    make: product.make || "",
    year: product.year || "",
    mileage: product.mileage || "",
    breed: product.breed || "",
    age: product.age || "",
    bedrooms: product.bedrooms || "",
    bathrooms: product.bathrooms || "",
  };
}

function Dashboard() {
  const { currentUser } = useAuth();

  const [products, setProducts] = useState([]);
  const [sellerChats, setSellerChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingActiveListings, setDeletingActiveListings] = useState(false);
  const [savingProductId, setSavingProductId] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState(null);

  useEffect(() => {
    if (!currentUser) return;

    let ignore = false;

    async function fetchSellerData() {
      try {
        setLoading(true);
        setError("");

        const productsQuery = query(
          collection(db, "products"),
          where("sellerId", "==", currentUser.uid)
        );
        const chatsQuery = query(
          collection(db, "chats"),
          where("sellerId", "==", currentUser.uid)
        );

        const [productSnapshot, chatSnapshot] = await Promise.all([
          getDocs(productsQuery),
          getDocs(chatsQuery),
        ]);

        const sellerProducts = productSnapshot.docs
          .map((item) => ({
            id: item.id,
            ...item.data(),
          }))
          .sort((a, b) => getTimeValue(b.createdAt) - getTimeValue(a.createdAt));

        const chats = chatSnapshot.docs
          .map((item) => ({
            id: item.id,
            ...item.data(),
          }))
          .sort((a, b) => getTimeValue(b.updatedAt) - getTimeValue(a.updatedAt));

        if (!ignore) {
          setProducts(sellerProducts);
          setSellerChats(chats);
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);

        if (!ignore) {
          setError("Failed to load dashboard data.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    fetchSellerData();

    return () => {
      ignore = true;
    };
  }, [currentUser]);

  const activeListings = useMemo(
    () =>
      products.filter(
        (product) =>
          product.sold !== true && getListingStatus(product) === "active"
      ),
    [products]
  );

  const soldListings = useMemo(
    () => products.filter((product) => product.sold === true),
    [products]
  );

  const stats = useMemo(() => {
    const revenue = products.reduce(
      (total, product) => total + getSalesTotal(product),
      0
    );
    const unitsSold = products.reduce(
      (total, product) => total + getUnitsSold(product),
      0
    );
    const stockUnits = products
      .filter((product) => product.sold !== true)
      .reduce((total, product) => total + getListingStock(product), 0);
    const pendingOffers = sellerChats.filter(
      (chat) => chat.lastOfferStatus === "pending"
    ).length;
    const acceptedOffers = sellerChats.filter(
      (chat) => chat.lastOfferStatus === "accepted"
    ).length;

    return {
      revenue,
      unitsSold,
      stockUnits,
      pendingOffers,
      acceptedOffers,
      paused: products.filter(
        (product) =>
          product.sold !== true && getListingStatus(product) === "paused"
      ).length,
      draft: products.filter(
        (product) =>
          product.sold !== true && getListingStatus(product) === "draft"
      ).length,
      outOfStock: products.filter(
        (product) => product.sold !== true && getListingStock(product) <= 0
      ).length,
    };
  }, [products, sellerChats]);

  const orderOverview = useMemo(() => {
    const soldOrders = products
      .filter((product) => getUnitsSold(product) > 0)
      .map((product) => {
        const unitsSold = getUnitsSold(product);

        return {
          id: `sold-${product.id}`,
          title: product.title || "Untitled listing",
          amount: getSalesTotal(product),
          status: `${unitsSold} unit${unitsSold === 1 ? "" : "s"} sold`,
          statusClass:
            product.sold === true
              ? "bg-green-50 text-green-700"
              : "bg-emerald-50 text-emerald-700",
          image: getListingImage(product),
          date:
            product.lastSoldAt ||
            product.soldAt ||
            product.updatedAt ||
            product.createdAt,
          to: `/product/${product.id}`,
        };
      });

    const offerOrders = sellerChats
      .filter((chat) => chat.lastOfferAmount || chat.lastOfferStatus)
      .map((chat) => {
        const status = chat.lastOfferStatus || "pending";

        return {
          id: `offer-${chat.id}`,
          title: chat.productTitle || "Listing offer",
          amount: Number(chat.lastOfferAmount || chat.productPrice) || 0,
          status:
            status === "accepted"
              ? "Accepted offer"
              : status === "rejected"
              ? "Rejected offer"
              : "Pending offer",
          statusClass:
            status === "accepted"
              ? "bg-green-50 text-green-700"
              : status === "rejected"
              ? "bg-red-50 text-red-600"
              : "bg-orange-50 text-orange-700",
          image:
            chat.productImage ||
            "https://placehold.co/800x600?text=Sellify",
          date: chat.updatedAt || chat.createdAt,
          to: `/chat/${chat.id}`,
        };
      });

    return [...soldOrders, ...offerOrders]
      .sort((a, b) => getTimeValue(b.date) - getTimeValue(a.date))
      .slice(0, 6);
  }, [sellerChats, products]);

  const filteredProducts = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return products.filter((product) => {
      const dashboardStatus = getDashboardStatus(product);
      const matchesStatus =
        statusFilter === "all" || dashboardStatus === statusFilter;
      const matchesSearch =
        searchTerm.length === 0 ||
        [
          product.title,
          product.category,
          product.location,
          product.brand,
          product.model,
          product.make,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(searchTerm);

      return matchesStatus && matchesSearch;
    });
  }, [products, search, statusFilter]);

  async function syncChatSoldState(productId, sold) {
    const chatsQuery = query(
      collection(db, "chats"),
      where("productId", "==", productId)
    );
    const snapshot = await getDocs(chatsQuery);

    for (let index = 0; index < snapshot.docs.length; index += 450) {
      const batch = writeBatch(db);
      const chunk = snapshot.docs.slice(index, index + 450);

      chunk.forEach((chatDoc) => {
        batch.update(chatDoc.ref, {
          productSold: sold,
          updatedAt: serverTimestamp(),
        });
      });

      await batch.commit();
    }
  }

  function patchProduct(productId, changes) {
    setProducts((currentProducts) =>
      currentProducts.map((product) =>
        product.id === productId
          ? {
              ...product,
              ...changes,
              updatedAt: new Date(),
            }
          : product
      )
    );
  }

  async function handleDelete(product) {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${product.title || "this listing"}"?`
    );

    if (!confirmDelete) return;

    try {
      setSavingProductId(product.id);
      await deleteDoc(doc(db, "products", product.id));

      setProducts((currentProducts) =>
        currentProducts.filter((item) => item.id !== product.id)
      );
    } catch (err) {
      console.error("Error deleting listing:", err);
      window.alert("Failed to delete listing. Please try again.");
    } finally {
      setSavingProductId("");
    }
  }

  async function handleDeleteActiveListings() {
    if (deletingActiveListings || activeListings.length === 0) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${activeListings.length} active listing${
        activeListings.length === 1 ? "" : "s"
      }? Sold, paused, and draft listings will not be deleted.`
    );

    if (!confirmDelete) return;

    try {
      setDeletingActiveListings(true);

      const productsQuery = query(
        collection(db, "products"),
        where("sellerId", "==", currentUser.uid)
      );
      const snapshot = await getDocs(productsQuery);
      const activeProductDocs = snapshot.docs.filter((productDoc) => {
        const data = productDoc.data();

        return data.sold !== true && getListingStatus(data) === "active";
      });

      for (let index = 0; index < activeProductDocs.length; index += 450) {
        const batch = writeBatch(db);
        const chunk = activeProductDocs.slice(index, index + 450);

        chunk.forEach((productDoc) => {
          batch.delete(productDoc.ref);
        });

        await batch.commit();
      }

      const deletedIds = new Set(activeProductDocs.map((item) => item.id));

      setProducts((currentProducts) =>
        currentProducts.filter((product) => !deletedIds.has(product.id))
      );
      window.alert(`${activeProductDocs.length} active listings deleted.`);
    } catch (err) {
      console.error("Error deleting active listings:", err);
      window.alert("Failed to delete active listings. Please try again.");
    } finally {
      setDeletingActiveListings(false);
    }
  }

  async function handleStatusChange(product, nextStatus) {
    const wasSold = product.sold === true;
    const currentStock = getListingStock(product);
    const currentUnitsSold = getUnitsSold(product);
    const currentSalesTotal = getSalesTotal(product);
    const unitPrice = Number(product.price) || 0;
    let soldQuantity = 0;
    let nextStock =
      nextStatus === "sold" ? 0 : Math.max(0, currentStock);
    let resolvedStatus = nextStatus;
    let nextSoldState = nextStatus === "sold";

    if (nextStatus === "sold" && !wasSold) {
      if (currentStock <= 0) {
        window.alert("This listing has no stock left to mark as sold.");
        return;
      }

      soldQuantity = 1;

      if (currentStock > 1) {
        const quantityInput = window.prompt(
          `How many units were sold? You currently have ${currentStock} in stock.`,
          "1"
        );

        if (quantityInput === null) return;

        soldQuantity = Math.round(Number(quantityInput));

        if (
          !Number.isFinite(soldQuantity) ||
          soldQuantity < 1 ||
          soldQuantity > currentStock
        ) {
          window.alert(`Please enter a quantity from 1 to ${currentStock}.`);
          return;
        }
      }

      nextStock = currentStock - soldQuantity;
      nextSoldState = nextStock === 0;
      resolvedStatus = nextSoldState ? "sold" : "active";
    }

    const updateData = {
      listingStatus: resolvedStatus,
      sold: nextSoldState,
      stock: nextStock,
      updatedAt: serverTimestamp(),
    };

    if (soldQuantity > 0) {
      const nextUnitsSold = currentUnitsSold + soldQuantity;
      const nextSalesTotal = currentSalesTotal + unitPrice * soldQuantity;

      updateData.unitsSold = nextUnitsSold;
      updateData.soldQuantity = nextUnitsSold;
      updateData.salesTotal = nextSalesTotal;
      updateData.saleTotal = nextSalesTotal;
      updateData.lastSoldQuantity = soldQuantity;
      updateData.lastSaleTotal = unitPrice * soldQuantity;
      updateData.lastSoldAt = serverTimestamp();
      updateData.inventoryUpdatedAt = serverTimestamp();
    }

    if (nextSoldState && !wasSold) {
      updateData.soldAt = serverTimestamp();
    }

    if (!nextSoldState && wasSold) {
      updateData.soldAt = null;
    }

    try {
      setSavingProductId(product.id);
      await updateDoc(doc(db, "products", product.id), updateData);

      if (wasSold !== nextSoldState) {
        await syncChatSoldState(product.id, nextSoldState);
      }

      patchProduct(product.id, {
        listingStatus: resolvedStatus,
        sold: nextSoldState,
        stock: nextStock,
        soldAt: nextSoldState ? product.soldAt || new Date() : null,
        ...(soldQuantity > 0
          ? {
              unitsSold: currentUnitsSold + soldQuantity,
              soldQuantity: currentUnitsSold + soldQuantity,
              salesTotal: currentSalesTotal + unitPrice * soldQuantity,
              saleTotal: currentSalesTotal + unitPrice * soldQuantity,
              lastSoldQuantity: soldQuantity,
              lastSaleTotal: unitPrice * soldQuantity,
              lastSoldAt: new Date(),
              inventoryUpdatedAt: new Date(),
            }
          : {}),
      });
    } catch (err) {
      console.error("Error updating listing status:", err);
      window.alert("Failed to update listing status.");
    } finally {
      setSavingProductId("");
    }
  }

  async function handleStockChange(product, nextStockValue) {
    const nextStock = Math.max(0, Math.round(Number(nextStockValue) || 0));

    try {
      setSavingProductId(product.id);
      await updateDoc(doc(db, "products", product.id), {
        stock: nextStock,
        inventoryUpdatedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      patchProduct(product.id, {
        stock: nextStock,
        inventoryUpdatedAt: new Date(),
      });
    } catch (err) {
      console.error("Error updating stock:", err);
      window.alert("Failed to update stock.");
    } finally {
      setSavingProductId("");
    }
  }

  function openEdit(product) {
    setEditingProduct(product);
    setEditForm(getEditForm(product));
  }

  function closeEdit() {
    setEditingProduct(null);
    setEditForm(null);
  }

  function handleEditChange(event) {
    setEditForm((currentForm) => ({
      ...currentForm,
      [event.target.name]: event.target.value,
    }));
  }

  async function handleSaveEdit(event) {
    event.preventDefault();

    if (!editingProduct || !editForm) return;

    if (!editForm.title.trim()) {
      window.alert("Please enter a listing title.");
      return;
    }

    const wasSold = editingProduct.sold === true;
    const currentUnitsSold = getUnitsSold(editingProduct);
    const currentSalesTotal = getSalesTotal(editingProduct);
    const unitPrice = Math.max(0, Number(editForm.price) || 0);
    const availableStock = Math.max(
      0,
      Math.round(Number(editForm.stock) || 0)
    );
    let soldQuantity = 0;
    let resolvedStatus = editForm.listingStatus;
    let nextSoldState = editForm.listingStatus === "sold";
    let nextStock = nextSoldState ? 0 : availableStock;

    if (editForm.listingStatus === "sold" && !wasSold) {
      if (availableStock <= 0) {
        window.alert("This listing has no stock left to mark as sold.");
        return;
      }

      soldQuantity = 1;

      if (availableStock > 1) {
        const quantityInput = window.prompt(
          `How many units were sold? You currently have ${availableStock} in stock.`,
          "1"
        );

        if (quantityInput === null) return;

        soldQuantity = Math.round(Number(quantityInput));

        if (
          !Number.isFinite(soldQuantity) ||
          soldQuantity < 1 ||
          soldQuantity > availableStock
        ) {
          window.alert(`Please enter a quantity from 1 to ${availableStock}.`);
          return;
        }
      }

      nextStock = availableStock - soldQuantity;
      nextSoldState = nextStock === 0;
      resolvedStatus = nextSoldState ? "sold" : "active";
    }

    const updateData = {
      title: editForm.title.trim(),
      price: unitPrice,
      category: editForm.category,
      listingStatus: resolvedStatus,
      stock: nextStock,
      condition: editForm.condition.trim(),
      location: editForm.location.trim(),
      address: editForm.address.trim(),
      phone: editForm.phone.trim(),
      description: editForm.description.trim(),
      brand: editForm.brand.trim(),
      model: editForm.model.trim(),
      storage: editForm.storage.trim(),
      ram: editForm.ram.trim(),
      size: editForm.size.trim(),
      gender: editForm.gender.trim(),
      make: editForm.make.trim(),
      year: editForm.year.trim(),
      mileage: editForm.mileage.trim(),
      breed: editForm.breed.trim(),
      age: editForm.age.trim(),
      bedrooms: editForm.bedrooms.trim(),
      bathrooms: editForm.bathrooms.trim(),
      sold: nextSoldState,
      updatedAt: serverTimestamp(),
    };

    if (soldQuantity > 0) {
      const nextUnitsSold = currentUnitsSold + soldQuantity;
      const nextSalesTotal = currentSalesTotal + unitPrice * soldQuantity;

      updateData.unitsSold = nextUnitsSold;
      updateData.soldQuantity = nextUnitsSold;
      updateData.salesTotal = nextSalesTotal;
      updateData.saleTotal = nextSalesTotal;
      updateData.lastSoldQuantity = soldQuantity;
      updateData.lastSaleTotal = unitPrice * soldQuantity;
      updateData.lastSoldAt = serverTimestamp();
      updateData.inventoryUpdatedAt = serverTimestamp();
    }

    if (nextSoldState && !wasSold) {
      updateData.soldAt = serverTimestamp();
    }

    if (!nextSoldState && wasSold) {
      updateData.soldAt = null;
    }

    try {
      setSavingProductId(editingProduct.id);
      await updateDoc(doc(db, "products", editingProduct.id), updateData);

      if (wasSold !== nextSoldState) {
        await syncChatSoldState(editingProduct.id, nextSoldState);
      }

      patchProduct(editingProduct.id, {
        ...updateData,
        soldAt: nextSoldState
          ? editingProduct.soldAt || new Date()
          : null,
        ...(soldQuantity > 0
          ? {
              unitsSold: currentUnitsSold + soldQuantity,
              soldQuantity: currentUnitsSold + soldQuantity,
              salesTotal: currentSalesTotal + unitPrice * soldQuantity,
              saleTotal: currentSalesTotal + unitPrice * soldQuantity,
              lastSoldQuantity: soldQuantity,
              lastSaleTotal: unitPrice * soldQuantity,
              lastSoldAt: new Date(),
              inventoryUpdatedAt: new Date(),
            }
          : {}),
      });
      closeEdit();
    } catch (err) {
      console.error("Error saving listing:", err);
      window.alert("Failed to save listing.");
    } finally {
      setSavingProductId("");
    }
  }

  if (!currentUser) {
    return (
      <p className="py-20 text-center">
        Please{" "}
        <Link to="/login" className="font-semibold text-green-600">
          login
        </Link>{" "}
        to view your dashboard.
      </p>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-green-600">
              Seller dashboard
            </p>

            <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">
              Manage your Sellify store
            </h1>

            <p className="mt-2 text-slate-500">
              Logged in as {currentUser.email}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleDeleteActiveListings}
              disabled={
                deletingActiveListings || loading || activeListings.length === 0
              }
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deletingActiveListings ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Trash2 size={18} />
              )}
              Delete Active Listings
            </button>

            <Link
              to="/sell"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-green-600 px-5 py-3 font-black text-white transition hover:bg-green-700"
            >
              <Plus size={18} />
              New Listing
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 font-semibold text-red-600">
            {error}
          </div>
        )}

        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={TrendingUp}
            label="Revenue"
            value={formatListingPrice(stats.revenue)}
            helper={`${stats.unitsSold} unit${
              stats.unitsSold === 1 ? "" : "s"
            } sold`}
          />
          <StatCard
            icon={ShoppingBag}
            label="Sales"
            value={stats.unitsSold}
            helper={`${stats.pendingOffers} pending offer${
              stats.pendingOffers === 1 ? "" : "s"
            }`}
          />
          <StatCard
            icon={BarChart3}
            label="Live listings"
            value={activeListings.length}
            helper={`${stats.paused} paused, ${stats.draft} draft`}
          />
          <StatCard
            icon={PackageCheck}
            label="Inventory"
            value={stats.stockUnits}
            helper={`${stats.outOfStock} out of stock`}
          />
        </section>

        <section className="mb-6 grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-950">
                  Listing management
                </h2>

                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {filteredProducts.length} of {products.length} listings shown
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-[180px_240px]">
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="h-12 rounded-2xl border border-slate-300 px-4 font-bold text-slate-700 outline-none focus:border-green-500"
                >
                  {FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="Search listings"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-12 rounded-2xl border border-slate-300 px-4 font-semibold outline-none focus:border-green-500"
                />
              </div>
            </div>

            {loading ? (
              <DashboardSkeleton />
            ) : products.length === 0 ? (
              <EmptyState
                title="No products yet"
                description="Create your first listing to start receiving buyer messages."
                action={
                  <Link
                    to="/sell"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-green-600 px-5 py-3 font-black text-white hover:bg-green-700"
                  >
                    <Plus size={18} />
                    Post a Listing
                  </Link>
                }
              />
            ) : filteredProducts.length === 0 ? (
              <EmptyState
                title="No listings match"
                description="Try another status filter or search term."
              />
            ) : (
              <div className="space-y-4">
                {filteredProducts.map((product) => (
                  <ListingRow
                    key={product.id}
                    product={product}
                    saving={savingProductId === product.id}
                    onDelete={handleDelete}
                    onEdit={openEdit}
                    onStatusChange={handleStatusChange}
                    onStockChange={handleStockChange}
                  />
                ))}
              </div>
            )}
          </div>

          <aside className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-2xl font-black text-slate-950">
                Order overview
              </h2>

              <p className="mt-1 text-sm font-semibold text-slate-500">
                Sales and recent offer activity
              </p>

              {loading ? (
                <div className="mt-5 space-y-3">
                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="h-20 animate-pulse rounded-2xl bg-slate-100"
                    />
                  ))}
                </div>
              ) : orderOverview.length === 0 ? (
                <EmptyState
                  compact
                  title="No orders yet"
                  description="Accepted offers and sold listings will appear here."
                />
              ) : (
                <div className="mt-5 space-y-3">
                  {orderOverview.map((order) => (
                    <Link
                      key={order.id}
                      to={order.to}
                      className="flex gap-3 rounded-2xl border border-slate-100 p-3 transition hover:border-green-200 hover:bg-green-50"
                    >
                      <img
                        src={order.image}
                        alt=""
                        className="h-16 w-16 rounded-xl object-cover"
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="line-clamp-1 font-black text-slate-900">
                            {order.title}
                          </p>

                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${order.statusClass}`}
                          >
                            {order.status}
                          </span>
                        </div>

                        <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                          <span className="font-black text-green-600">
                            {formatListingPrice(order.amount)}
                          </span>

                          <span className="font-semibold text-slate-400">
                            {formatDate(order.date)}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-2xl font-black text-slate-950">
                Listing status
              </h2>

              <div className="mt-5 space-y-3">
                <StatusMeter label="Active" value={activeListings.length} />
                <StatusMeter label="Paused" value={stats.paused} />
                <StatusMeter label="Draft" value={stats.draft} />
                <StatusMeter label="Sold" value={soldListings.length} />
                <StatusMeter label="Out of stock" value={stats.outOfStock} />
              </div>
            </div>
          </aside>
        </section>
      </div>

      {editingProduct && editForm && (
        <EditListingModal
          form={editForm}
          saving={savingProductId === editingProduct.id}
          onChange={handleEditChange}
          onClose={closeEdit}
          onSubmit={handleSaveEdit}
        />
      )}
    </main>
  );
}

function StatCard({ icon: Icon, label, value, helper }) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-slate-400">
            {label}
          </p>

          <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>

          <p className="mt-2 text-sm font-semibold text-slate-500">{helper}</p>
        </div>

        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-green-50 text-green-600">
          <Icon size={22} />
        </span>
      </div>
    </div>
  );
}

function ListingRow({
  product,
  saving,
  onDelete,
  onEdit,
  onStatusChange,
  onStockChange,
}) {
  const status = getDashboardStatus(product);
  const statusMeta = STATUS_META[status] || STATUS_META.active;
  const StatusIcon = statusMeta.Icon;
  const stock = getListingStock(product);
  const sold = product.sold === true;

  return (
    <article className="grid gap-4 rounded-[1.6rem] border border-slate-200 p-4 transition hover:border-green-200 hover:shadow-sm lg:grid-cols-[150px_1fr]">
      <div className="relative overflow-hidden rounded-2xl bg-slate-100">
        <img
          src={getListingImage(product)}
          alt={product.title || "Listing"}
          className={`h-40 w-full object-cover lg:h-full ${
            sold ? "grayscale" : ""
          }`}
        />

        <span
          className={`absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-black ring-1 ${statusMeta.className}`}
        >
          <StatusIcon size={12} />
          {statusMeta.label}
        </span>
      </div>

      <div className="min-w-0">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-green-600">
              {product.category || "General"}
            </p>

            <h3 className="mt-1 line-clamp-1 text-xl font-black text-slate-950">
              {product.title || "Untitled listing"}
            </h3>

            <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">
              {product.description || "No description provided."}
            </p>
          </div>

          <div className="shrink-0 text-left md:text-right">
            <p className="text-2xl font-black text-green-600">
              {formatListingPrice(product.price)}
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-500">
              {product.location || "Nigeria"}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[180px_1fr] md:items-end">
          <label>
            <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">
              Status
            </span>

            <select
              value={getListingStatus(product)}
              disabled={saving}
              onChange={(event) => onStatusChange(product, event.target.value)}
              className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm font-bold text-slate-700 outline-none focus:border-green-500 disabled:opacity-50"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div>
            <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">
              Inventory
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={saving || sold}
                onClick={() => onStockChange(product, stock - 1)}
                className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-200 font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                -
              </button>

              <span className="grid h-11 min-w-20 place-items-center rounded-2xl bg-slate-100 px-4 text-sm font-black text-slate-700">
                {stock} in stock
              </span>

              <button
                type="button"
                disabled={saving || sold}
                onClick={() => onStockChange(product, stock + 1)}
                className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-200 font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                +
              </button>

              <div className="ml-auto flex flex-wrap gap-2">
                <Link
                  to={`/product/${product.id}`}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 text-sm font-black text-slate-700 transition hover:bg-slate-200"
                >
                  <Eye size={16} />
                  View
                </Link>

                <button
                  type="button"
                  onClick={() => onEdit(product)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-green-50 px-4 text-sm font-black text-green-700 transition hover:bg-green-100"
                >
                  <Edit3 size={16} />
                  Edit
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => onDelete(product)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-red-50 px-4 text-sm font-black text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function EditListingModal({ form, saving, onChange, onClose, onSubmit }) {
  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/50 px-4 py-8 backdrop-blur-sm">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-green-600">
              Edit listing
            </p>

            <h2 className="text-2xl font-black text-slate-950">
              Product details
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="px-6 py-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Title"
              name="title"
              value={form.title}
              onChange={onChange}
            />
            <Field
              label="Price"
              name="price"
              type="number"
              value={form.price}
              onChange={onChange}
            />
            <SelectField
              label="Category"
              name="category"
              value={form.category}
              onChange={onChange}
              options={LISTING_CATEGORIES}
            />
            <SelectField
              label="Status"
              name="listingStatus"
              value={form.listingStatus}
              onChange={onChange}
              options={STATUS_OPTIONS.map((option) => option.value)}
              getLabel={(value) =>
                STATUS_OPTIONS.find((option) => option.value === value)
                  ?.label || value
              }
            />
            <Field
              label="Stock"
              name="stock"
              type="number"
              value={form.stock}
              onChange={onChange}
            />
            <Field
              label="Condition"
              name="condition"
              value={form.condition}
              onChange={onChange}
            />
            <Field
              label="Location"
              name="location"
              value={form.location}
              onChange={onChange}
            />
            <Field
              label="Phone"
              name="phone"
              value={form.phone}
              onChange={onChange}
            />
            <Field
              label="Address"
              name="address"
              value={form.address}
              onChange={onChange}
            />
            <Field
              label="Brand / Make"
              name="brand"
              value={form.brand}
              onChange={onChange}
            />
            <Field
              label="Model"
              name="model"
              value={form.model}
              onChange={onChange}
            />
            <Field
              label="Storage"
              name="storage"
              value={form.storage}
              onChange={onChange}
            />
            <Field label="RAM" name="ram" value={form.ram} onChange={onChange} />
            <Field
              label="Size"
              name="size"
              value={form.size}
              onChange={onChange}
            />
            <Field
              label="Gender"
              name="gender"
              value={form.gender}
              onChange={onChange}
            />
            <Field
              label="Vehicle make"
              name="make"
              value={form.make}
              onChange={onChange}
            />
            <Field
              label="Year"
              name="year"
              value={form.year}
              onChange={onChange}
            />
            <Field
              label="Mileage"
              name="mileage"
              value={form.mileage}
              onChange={onChange}
            />
            <Field
              label="Breed"
              name="breed"
              value={form.breed}
              onChange={onChange}
            />
            <Field label="Age" name="age" value={form.age} onChange={onChange} />
            <Field
              label="Bedrooms"
              name="bedrooms"
              value={form.bedrooms}
              onChange={onChange}
            />
            <Field
              label="Bathrooms"
              name="bathrooms"
              value={form.bathrooms}
              onChange={onChange}
            />
          </div>

          <TextArea
            label="Description"
            name="description"
            value={form.description}
            onChange={onChange}
          />

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 px-5 py-3 font-black text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-green-600 px-5 py-3 font-black text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving && <Loader2 size={18} className="animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, name, value, onChange, type = "text" }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-slate-700">
        {label}
      </span>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        className="h-12 w-full rounded-2xl border border-slate-300 px-4 font-semibold outline-none transition focus:border-green-500"
      />
    </label>
  );
}

function SelectField({ label, name, value, onChange, options, getLabel }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-slate-700">
        {label}
      </span>

      <select
        name={name}
        value={value}
        onChange={onChange}
        className="h-12 w-full rounded-2xl border border-slate-300 px-4 font-semibold outline-none transition focus:border-green-500"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {getLabel ? getLabel(option) : option}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextArea({ label, name, value, onChange }) {
  return (
    <label className="mt-4 block">
      <span className="mb-2 block text-sm font-black text-slate-700">
        {label}
      </span>

      <textarea
        name={name}
        rows="5"
        value={value}
        onChange={onChange}
        className="w-full rounded-2xl border border-slate-300 px-4 py-3 font-semibold outline-none transition focus:border-green-500"
      />
    </label>
  );
}

function StatusMeter({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
      <span className="font-bold text-slate-600">{label}</span>
      <span className="text-xl font-black text-slate-950">{value}</span>
    </div>
  );
}

function EmptyState({ title, description, action, compact = false }) {
  return (
    <div
      className={`rounded-[2rem] border border-dashed border-slate-300 bg-slate-50 px-6 text-center ${
        compact ? "mt-5 py-10" : "py-16"
      }`}
    >
      <h3 className="text-2xl font-black text-slate-900">{title}</h3>

      <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-slate-500">
        {description}
      </p>

      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="h-48 animate-pulse rounded-[1.6rem] bg-slate-100"
        />
      ))}
    </div>
  );
}

export default Dashboard;
