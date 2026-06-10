import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

import {
  addDoc,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

import { db } from "../firebase/firebase";
import { useAuth } from "../context/AuthContext";
import { getProductContactInfo } from "../utils/contact";
import {
  getListingStock,
  getSalesTotal,
  getUnitsSold,
} from "../utils/listings";

import {
  MapPin,
  Heart,
  ShieldCheck,
  MessageCircle,
  Phone,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

function NairaIcon({ className = "", size = 18 }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-grid shrink-0 place-items-center font-black leading-none ${className}`}
      style={{
        height: size,
        width: size,
        fontSize: Math.round(size * 0.9),
      }}
    >
      {"\u20a6"}
    </span>
  );
}

function ProductDetail() {
  const { id } = useParams();
  const { currentUser, userRole, roleLoading } = useAuth();
  const navigate = useNavigate();
  const isAdmin = Boolean(currentUser && userRole === "admin");
  const canUseMarketplaceActions = Boolean(
    !currentUser || (!roleLoading && userRole === "user")
  );

  const [product, setProduct] = useState(null);
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);

  const [activeImage, setActiveImage] = useState(0);
  const [showPhone, setShowPhone] = useState(false);
  const [showAddress, setShowAddress] = useState(false);
  const [makingOffer, setMakingOffer] = useState(false);
  const [markingSold, setMarkingSold] = useState(false);

  const [isFavorite, setIsFavorite] = useState(false);
  const [pop, setPop] = useState(false);

  useEffect(() => {
    async function fetchProduct() {
      try {
        const docSnap = await getDoc(doc(db, "products", id));

        if (docSnap.exists()) {
          const productData = {
            id: docSnap.id,
            ...docSnap.data(),
          };

          setSeller(null);
          setProduct(productData);
          setActiveImage(0);

          if (currentUser && !roleLoading && userRole === "user") {
            const favRef = doc(
              db,
              "users",
              currentUser.uid,
              "favorites",
              productData.id
            );

            const favSnap = await getDoc(favRef);
            setIsFavorite(favSnap.exists());
          } else {
            setIsFavorite(false);
          }

        } else {
          setProduct(null);
          setSeller(null);
        }
      } catch (error) {
        console.error(error);
      }

      setLoading(false);
    }

    fetchProduct();
  }, [id, currentUser, roleLoading, userRole]);

  useEffect(() => {
    if (!product?.sellerId) {
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "users", product.sellerId),
      (sellerSnap) => {
        setSeller(sellerSnap.exists() ? sellerSnap.data() : null);
      },
      (error) => {
        console.error("Seller profile fetch error:", error);
      }
    );

    return unsubscribe;
  }, [product?.sellerId]);

  async function toggleFavorite() {
    if (!canUseMarketplaceActions) return;

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

  async function createOrOpenChat() {
    if (!canUseMarketplaceActions) return null;
    if (!product || product.sold || !product.sellerId) return null;

    const productPhone = getProductContactInfo(product, seller, "");

    const chatId = [currentUser.uid, product.sellerId, product.id]
      .sort()
      .join("_");
    const chatRef = doc(db, "chats", chatId);
    const chatSnap = await getDoc(chatRef);
    const existingChat = chatSnap.exists() ? chatSnap.data() : {};

    await setDoc(
      chatRef,
      {
        productId: product.id,
        productTitle: product.title || "",
        productImage: product.imageUrl || product.images?.[0] || "",
        productPrice: product.price || 0,
        productPhone,
        sellerId: product.sellerId,
        buyerId: currentUser.uid,
        participants: [currentUser.uid, product.sellerId],
        sellerEmail: product.sellerEmail || "",
        buyerEmail: currentUser.email || "",
        productSold: product.sold === true,
        updatedAt: serverTimestamp(),
        ...(chatSnap.exists()
          ? {}
          : {
              createdAt: serverTimestamp(),
              spamFor: {},
              deletedFor: {},
              unreadCounts: {
                [currentUser.uid]: 0,
                [product.sellerId]: 0,
              },
            }),
      },
      { merge: true }
    );

    return { chatId, chatRef, existingChat };
  }

  async function startChat() {
    if (!canUseMarketplaceActions) return;

    if (!currentUser) {
      navigate("/login");
      return;
    }

    try {
      const chat = await createOrOpenChat();
      if (!chat) return;

      navigate(`/chat/${chat.chatId}`);
    } catch (err) {
      console.error("Start chat error:", err);
    }
  }

  async function getOfferSenderName() {
    if (!currentUser) return "A buyer";

    try {
      const userSnap = await getDoc(doc(db, "users", currentUser.uid));

      if (userSnap.exists()) {
        const profile = userSnap.data();

        if (profile.username) return `@${profile.username}`;
        if (profile.name) return profile.name;
      }
    } catch (err) {
      console.error("Offer sender profile fetch error:", err);
    }

    return currentUser.displayName || "A buyer";
  }

  async function makeOffer() {
    if (!canUseMarketplaceActions) return;

    if (!currentUser) {
      navigate("/login");
      return;
    }

    if (!product || product.sold || makingOffer) return;

    const offerInput = window.prompt("Enter your offer amount in naira");
    if (offerInput === null) return;

    const offerAmount = Number(offerInput.replace(/[^\d.]/g, ""));

    if (!Number.isFinite(offerAmount) || offerAmount <= 0) {
      window.alert("Please enter a valid offer amount.");
      return;
    }

    const formattedOffer = `₦${offerAmount.toLocaleString()}`;
    const offerMessage = `Offer: ${formattedOffer} for ${
      product.title || "this listing"
    }`;

    try {
      setMakingOffer(true);

      const chat = await createOrOpenChat();
      if (!chat) return;

      const sellerUnread =
        chat.existingChat.unreadCounts?.[product.sellerId] || 0;
      const senderName = await getOfferSenderName();

      const offerMessageRef = await addDoc(
        collection(db, "chats", chat.chatId, "messages"),
        {
          text: offerMessage,
          type: "offer",
          offerKind: "offer",
          offerStatus: "pending",
          status: "pending",
          dashboardApprovalStatus: "pending",
          saleStatus: "offerPending",
          offerAmount,
          senderId: currentUser.uid,
          receiverId: product.sellerId,
          read: false,
          createdAt: serverTimestamp(),
        }
      );

      await updateDoc(chat.chatRef, {
        lastMessage: offerMessage,
        lastSenderId: currentUser.uid,
        lastOfferAmount: offerAmount,
        lastOfferStatus: "pending",
        lastOfferKind: "offer",
        lastOfferMessageId: offerMessageRef.id,
        dashboardOfferMessageId: offerMessageRef.id,
        lastOfferSenderId: currentUser.uid,
        lastOfferReceiverId: product.sellerId,
        offerStatus: "pending",
        dashboardApprovalStatus: "pending",
        saleStatus: "offerPending",
        finalSoldPrice: null,
        acceptedOfferAmount: null,
        acceptedOfferMessageId: null,
        updatedAt: serverTimestamp(),
        [`unreadCounts.${product.sellerId}`]: sellerUnread + 1,
        [`deletedFor.${currentUser.uid}`]: false,
        [`deletedFor.${product.sellerId}`]: false,
        [`spamFor.${currentUser.uid}`]: false,
        [`spamFor.${product.sellerId}`]: false,
      });

      await addDoc(collection(db, "users", product.sellerId, "alerts"), {
        type: "offer",
        title: "New offer",
        message: `${senderName} offered ${formattedOffer} for ${
          product.title || "your listing"
        }.`,
        chatId: chat.chatId,
        productId: product.id,
        productTitle: product.title || "",
        senderId: currentUser.uid,
        offerAmount,
        offerStatus: "pending",
        read: false,
        createdAt: serverTimestamp(),
      });

      navigate(`/chat/${chat.chatId}`);
    } catch (err) {
      console.error("Make offer error:", err);
    } finally {
      setMakingOffer(false);
    }
  }

  async function markAsSold() {
    if (!canUseMarketplaceActions) return;
    if (!product || !currentUser) return;

    const currentStock = getListingStock(product);
    const currentUnitsSold = getUnitsSold(product);
    const currentSalesTotal = getSalesTotal(product);
    const baseUnitPrice = Number(product.price) || 0;

    if (currentStock <= 0) {
      window.alert("This listing has no stock left to mark as sold.");
      return;
    }

    let soldQuantity = 1;

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

    try {
      setMarkingSold(true);

      const saleUnitPrice = baseUnitPrice;
      const saleTotal = saleUnitPrice * soldQuantity;
      const nextStock = currentStock - soldQuantity;
      const nextUnitsSold = currentUnitsSold + soldQuantity;
      const nextSalesTotal = currentSalesTotal + saleTotal;
      const fullySold = nextStock === 0;
      const saleUpdate = {
        sold: fullySold,
        listingStatus: fullySold ? "sold" : "active",
        stock: nextStock,
        unitsSold: nextUnitsSold,
        soldQuantity: nextUnitsSold,
        salesTotal: nextSalesTotal,
        saleTotal: nextSalesTotal,
        lastSoldQuantity: soldQuantity,
        lastSaleTotal: saleTotal,
        finalSoldPrice: saleUnitPrice,
        finalSaleUnitPrice: saleUnitPrice,
        acceptedOfferAmount: null,
        acceptedOfferChatId: null,
        finalSaleSource: "manualListingPrice",
        lastSoldAt: serverTimestamp(),
        inventoryUpdatedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (fullySold) {
        saleUpdate.soldAt = serverTimestamp();
      }

      await setDoc(
        doc(db, "products", product.id),
        saleUpdate,
        { merge: true }
      );

      if (fullySold) {
        const chatsQuery = query(
          collection(db, "chats"),
          where("productId", "==", product.id)
        );

        const chatsSnap = await getDocs(chatsQuery);
        const batch = writeBatch(db);

        chatsSnap.docs.forEach((chatDoc) => {
          batch.update(chatDoc.ref, {
            productSold: true,
            updatedAt: serverTimestamp(),
          });
        });

        await batch.commit();
      }

      setProduct((prev) => ({
        ...prev,
        sold: fullySold,
        listingStatus: fullySold ? "sold" : "active",
        stock: nextStock,
        unitsSold: nextUnitsSold,
        soldQuantity: nextUnitsSold,
        salesTotal: nextSalesTotal,
        saleTotal: nextSalesTotal,
        lastSoldQuantity: soldQuantity,
        lastSaleTotal: saleTotal,
        finalSoldPrice: saleUnitPrice,
        finalSaleUnitPrice: saleUnitPrice,
        acceptedOfferAmount: null,
        acceptedOfferChatId: null,
        finalSaleSource: "manualListingPrice",
        lastSoldAt: new Date(),
        soldAt: fullySold ? new Date() : prev.soldAt,
      }));
    } catch (err) {
      console.error("Sold update error:", err);
    }

    setMarkingSold(false);
  }

  function renderSpecs() {
    const specs = [];

    if (product.brand) specs.push(["Brand", product.brand]);
    if (product.model) specs.push(["Model", product.model]);
    if (product.storage) specs.push(["Storage", product.storage]);
    if (product.ram) specs.push(["RAM", product.ram]);
    if (product.condition) specs.push(["Condition", product.condition]);
    if (product.size) specs.push(["Size", product.size]);
    if (product.gender) specs.push(["Gender", product.gender]);
    if (product.make) specs.push(["Make", product.make]);
    if (product.year) specs.push(["Year", product.year]);
    if (product.mileage) specs.push(["Mileage", product.mileage]);
    if (product.breed) specs.push(["Breed", product.breed]);
    if (product.age) specs.push(["Age", product.age]);
    if (product.bedrooms) specs.push(["Bedrooms", product.bedrooms]);
    if (product.bathrooms) specs.push(["Bathrooms", product.bathrooms]);
    if (product.sold !== true) {
      specs.push(["Available stock", getListingStock(product)]);
    }
    if (getUnitsSold(product) > 0) {
      specs.push(["Units sold", getUnitsSold(product)]);
    }

    if (specs.length === 0) return null;

    return (
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm sm:rounded-[2rem] sm:p-7">
        <h2 className="text-2xl font-black text-slate-900">
          Product details
        </h2>

        <div className="mt-6 grid gap-x-10 gap-y-5 md:grid-cols-2">
          {specs.map(([label, value]) => (
            <div key={label} className="border-b border-slate-100 pb-3">
              <p className="text-sm font-bold uppercase tracking-wide text-slate-400">
                {label}
              </p>

              <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
            </div>
          ))}
        </div>
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

  if (!product) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-xl font-bold text-gray-600">Product not found.</p>
      </div>
    );
  }

  const productImages =
    product.images && product.images.length > 0
      ? product.images
      : product.imageUrl
      ? [product.imageUrl]
      : [];

  const mainImage =
    productImages[activeImage] ||
    "https://placehold.co/1200x700?text=Sellify";

  const isSeller =
    currentUser &&
    !roleLoading &&
    userRole === "user" &&
    currentUser.uid === product.sellerId;
  const contactInfo = getProductContactInfo(product, seller);

  const sellerAvatar =
    seller?.photoUrl ||
    "https://api.dicebear.com/7.x/initials/svg?seed=" +
      (seller?.username || seller?.name || product.sellerEmail || "Seller");

  function nextImage() {
    if (productImages.length <= 1) return;

    setActiveImage((current) =>
      current === productImages.length - 1 ? 0 : current + 1
    );
  }

  function prevImage() {
    if (productImages.length <= 1) return;

    setActiveImage((current) =>
      current === 0 ? productImages.length - 1 : current - 1
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 px-4 py-6">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="min-w-0 space-y-6">
          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            <div className="relative bg-black">
              <img
                src={mainImage}
                alt={product.title}
                className={`h-[320px] w-full bg-black object-contain sm:h-[460px] lg:h-[620px] ${
                  product.sold ? "grayscale" : ""
                }`}
              />

              {productImages.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-3 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60 sm:left-5 sm:h-14 sm:w-14"
                  >
                    <ChevronLeft size={34} />
                  </button>

                  <button
                    onClick={nextImage}
                    className="absolute right-3 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60 sm:right-5 sm:h-14 sm:w-14"
                  >
                    <ChevronRight size={34} />
                  </button>
                </>
              )}

              <div className="absolute bottom-4 left-4 rounded-full bg-black/70 px-3 py-2 text-xs font-black text-white backdrop-blur sm:bottom-5 sm:left-5 sm:px-4 sm:text-sm">
                📷 {productImages.length ? activeImage + 1 : 0}/
                {productImages.length}
              </div>

              <div className="absolute left-4 top-4 flex max-w-[calc(100%-5rem)] flex-wrap items-center gap-2 sm:left-5 sm:top-5 sm:gap-3">
                <span className="rounded-full bg-white/90 px-4 py-2 text-xs font-black uppercase tracking-wide text-green-700 backdrop-blur">
                  {product.category || "General"}
                </span>

                {product.sold && (
                  <span className="rounded-full bg-red-500 px-4 py-2 text-xs font-black uppercase tracking-wide text-white shadow-lg">
                    SOLD
                  </span>
                )}
              </div>

              {canUseMarketplaceActions && (
                <button
                  onClick={toggleFavorite}
                  className={`absolute right-4 top-4 z-20 grid h-11 w-11 place-items-center rounded-full bg-white/90 shadow-lg backdrop-blur transition-all duration-200 hover:bg-red-50 sm:right-5 sm:top-5 sm:h-12 sm:w-12 ${
                    isFavorite
                      ? "text-red-500"
                      : "text-slate-700 hover:text-red-500"
                  } ${pop ? "scale-125" : "scale-100"}`}
                >
                  <Heart
                    size={22}
                    fill={isFavorite ? "currentColor" : "none"}
                  />
                </button>
              )}
            </div>

            {productImages.length > 1 && (
              <div className="flex gap-3 overflow-x-auto bg-white p-4">
                {productImages.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    onClick={() => setActiveImage(index)}
                    className={`relative h-24 w-32 shrink-0 overflow-hidden rounded-xl border-4 transition sm:h-32 sm:w-40 ${
                      activeImage === index
                        ? "border-green-600"
                        : "border-transparent opacity-80 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={image}
                      alt={`thumb-${index}`}
                      className="h-full w-full object-cover"
                    />

                    {index === 0 && (
                      <span className="absolute left-2 top-2 rounded-full bg-green-600 px-2 py-0.5 text-[10px] font-black text-white">
                        Cover
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm sm:rounded-[2rem] sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <MapPin size={15} />
                  {product.location || "Nigeria"}
                </div>

                <h1 className="mt-3 break-words text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                  {product.title}
                </h1>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1 rounded-full bg-green-100 px-4 py-2 text-sm font-black text-green-700">
                    <ShieldCheck size={16} />
                    Verified listing
                  </span>

                  {product.sold && (
                    <span className="rounded-full bg-red-100 px-4 py-2 text-sm font-black text-red-600">
                      This advert is no longer available
                    </span>
                  )}
                </div>
              </div>

              <div
                className={`w-full rounded-2xl px-5 py-5 text-left sm:w-auto sm:px-6 sm:text-right ${
                  product.sold ? "bg-red-50" : "bg-green-50"
                }`}
              >
                <p
                  className={`text-sm font-bold uppercase tracking-wide ${
                    product.sold ? "text-red-600" : "text-green-700"
                  }`}
                >
                  {product.sold ? "Status" : "Price"}
                </p>

                <p
                  className={`mt-1 break-words text-3xl font-black sm:text-4xl ${
                    product.sold ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {product.sold
                    ? "SOLD"
                    : `₦${product.price?.toLocaleString()}`}
                </p>
              </div>
            </div>
          </div>

          {renderSpecs()}

          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm sm:rounded-[2rem] sm:p-7">
            <h2 className="text-2xl font-black text-slate-900">
              Description
            </h2>

            <p className="mt-5 whitespace-pre-line break-words leading-8 text-slate-600">
              {product.description || "No description provided."}
            </p>
          </div>

          {product.address && (
            <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
              <button
                onClick={() => setShowAddress(!showAddress)}
                className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left sm:px-7 sm:py-6"
              >
                <div>
                  <p className="text-lg font-black text-slate-900">
                    Seller address
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    View pickup/store location
                  </p>
                </div>

                <ChevronDown
                  size={22}
                  className={`transition ${showAddress ? "rotate-180" : ""}`}
                />
              </button>

              {showAddress && (
                <div className="break-words border-t border-slate-100 px-5 py-5 text-slate-600 sm:px-7">
                  {product.address}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-5">
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm sm:rounded-[2rem] sm:p-6 lg:sticky lg:top-28">
            <div className="flex min-w-0 items-center gap-4">
              <img
                src={sellerAvatar}
                alt={seller?.name || "Seller"}
                className="h-16 w-16 rounded-full border-2 border-green-100 object-cover"
              />

              <div className="min-w-0">
                <h3 className="text-lg font-black text-slate-900">
                  {seller?.name || "Seller"}
                </h3>

                {seller?.username && (
                  <p className="font-semibold text-green-600">
                    @{seller.username}
                  </p>
                )}

                <p className="mt-1 text-sm text-slate-500">
                  {product.sold ? "Listing closed" : "Active seller"}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {!canUseMarketplaceActions && currentUser ? (
                <div className="rounded-2xl border border-green-100 bg-green-50 px-5 py-5 text-center">
                  <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-white text-green-600">
                    <ShieldCheck size={24} />
                  </div>

                  <p className="text-lg font-black text-green-700">
                    {roleLoading ? "Checking account access" : "View only as admin"}
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {roleLoading
                      ? "Marketplace actions will appear if this account is a normal user."
                      : "Admin accounts can review this listing but cannot contact sellers, make offers, favorite products, or manage seller actions from the marketplace view."}
                  </p>
                </div>
              ) : !isSeller ? (
                <>
                  {product.sold ? (
                    <div className="rounded-2xl bg-red-50 py-5 text-center">
                      <p className="text-lg font-black text-red-600">
                        This item has been sold
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        Chat is closed for this advert
                      </p>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => setShowPhone(true)}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-green-600 px-4 py-4 font-bold text-green-700 transition hover:bg-green-50"
                      >
                        <Phone size={18} />
                        <span className="min-w-0 break-all">
                          {showPhone ? contactInfo : "Show contact"}
                        </span>
                      </button>

                      <button
                        onClick={makeOffer}
                        disabled={makingOffer}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-green-600 py-4 font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <NairaIcon
                          size={18}
                          className="rounded-full border-2 border-white text-white"
                        />
                        {makingOffer ? "Sending offer..." : "Make offer"}
                      </button>

                      <button
                        onClick={startChat}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 py-4 font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        <MessageCircle size={18} />
                        Start chat
                      </button>
                    </>
                  )}
                </>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-2xl bg-slate-100 py-4 text-center font-semibold text-slate-500">
                    This is your listing
                  </div>

                  {!product.sold ? (
                    <button
                      onClick={markAsSold}
                      disabled={markingSold}
                      className="w-full rounded-2xl bg-red-500 py-4 font-black text-white transition hover:bg-red-600 disabled:opacity-60"
                    >
                      {markingSold ? "Marking as sold..." : "Mark as Sold"}
                    </button>
                  ) : (
                    <div className="rounded-2xl bg-red-50 py-4 text-center font-black text-red-600">
                      SOLD
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductDetail;
