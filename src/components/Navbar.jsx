import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  Bell,
  Heart,
  Menu,
  MessageCircle,
  ChevronDown,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { db } from "../firebase/firebase";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { LISTING_CATEGORIES } from "../utils/categories";

function Navbar() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState({
    uid: "",
    photoUrl: "",
    name: "",
    username: "",
  });
  const [showCategories, setShowCategories] = useState(false);
  const categoriesRef = useRef(null);

  const [chatCount, setChatCount] = useState(0);
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const userId = currentUser.uid;

    const unsubscribe = onSnapshot(
      doc(db, "users", userId),
      (snap) => {
        if (!snap.exists()) {
          setProfile({
            uid: userId,
            photoUrl: "",
            name: "",
            username: "",
          });
          return;
        }

        const data = snap.data();

        setProfile({
          uid: userId,
          photoUrl: data.photoUrl || "",
          name: data.name || "",
          username: data.username || "",
        });
      },
      (err) => {
        console.error("Navbar profile fetch error:", err);
      }
    );

    return unsubscribe;
  }, [currentUser]);

  const activeProfile = currentUser?.uid === profile.uid ? profile : null;
  const profilePhoto = activeProfile?.photoUrl || currentUser?.photoURL || "";
  const profileName = activeProfile?.name || currentUser?.displayName || "";
  const profileUsername = activeProfile?.username || "";

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const unsubscribe = onSnapshot(collection(db, "chats"), (snapshot) => {
      let totalUnread = 0;

      snapshot.docs.forEach((item) => {
        const chat = {
          id: item.id,
          ...item.data(),
        };

        const isParticipant = chat.participants?.includes(currentUser.uid);
        const isSpamForMe = chat.spamFor?.[currentUser.uid] === true;
        const myUnreadCount = chat.unreadCounts?.[currentUser.uid] || 0;

        if (isParticipant && !isSpamForMe) {
          totalUnread += myUnreadCount;
        }
      });

      setChatCount(totalUnread);
    });

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (!showCategories) return;

    function handleClickOutside(event) {
      if (
        categoriesRef.current &&
        !categoriesRef.current.contains(event.target)
      ) {
        setShowCategories(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setShowCategories(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showCategories]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, "users", currentUser.uid, "alerts"),
      (snapshot) => {
        const unreadAlerts = snapshot.docs
          .map((item) => ({
            id: item.id,
            ...item.data(),
          }))
          .filter((alert) => alert.read !== true);

        setAlertCount(unreadAlerts.length);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const avatarInitial =
    profileUsername?.charAt(0)?.toUpperCase() ||
    profileName?.charAt(0)?.toUpperCase() ||
    currentUser?.email?.charAt(0)?.toUpperCase() ||
    "U";

  function handleSearch(e) {
    e.preventDefault();

    const value = e.currentTarget.search.value.trim();

    navigate(value ? `/browse?search=${encodeURIComponent(value)}` : "/browse");
  }

  function goToCategory(category) {
    setShowCategories(false);
    navigate(`/browse?category=${encodeURIComponent(category)}`);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-3 py-3 sm:px-4 lg:flex-nowrap lg:gap-4 lg:px-5 lg:py-4">
        <Link
          to="/"
          className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3"
        >
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-green-600 text-lg font-black text-white shadow-sm sm:h-11 sm:w-11 sm:rounded-2xl sm:text-xl">
            S
          </div>

          <div className="min-w-0 leading-none">
            <div className="text-xl font-black tracking-tight text-black sm:text-2xl">
              ellify
            </div>

            <p className="mt-1 hidden text-[11px] font-bold uppercase tracking-[0.25em] text-slate-400 sm:block">
              Marketplace
            </p>
          </div>
        </Link>

        <div
          ref={categoriesRef}
          className="relative order-1 shrink-0 lg:order-none"
        >
          <button
            type="button"
            onClick={() => setShowCategories(!showCategories)}
            aria-expanded={showCategories}
            aria-haspopup="menu"
            className="flex h-10 items-center gap-1.5 rounded-xl border border-slate-300 px-3 text-sm font-bold text-slate-700 transition hover:border-green-500 hover:text-green-600 sm:h-11 sm:gap-2 sm:px-4 lg:h-auto lg:rounded-2xl lg:py-3 lg:text-base"
          >
            <Menu size={18} className="shrink-0" />
            <span>Categories</span>
            <ChevronDown
              size={16}
              className={`transition ${showCategories ? "rotate-180" : ""}`}
            />
          </button>

          {showCategories && (
            <div className="fixed left-3 right-3 top-[4.6rem] z-[70] max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl sm:left-auto sm:right-4 sm:w-72 lg:absolute lg:left-0 lg:right-auto lg:top-full lg:mt-3 lg:w-72">
              <div className="space-y-1">
                {LISTING_CATEGORIES.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => goToCategory(category)}
                    className="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-green-50 hover:text-green-600"
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <form
          onSubmit={handleSearch}
          className="order-3 w-full flex-none lg:order-none lg:block lg:flex-1"
        >
          <div className="flex overflow-hidden rounded-2xl border-2 border-slate-300 bg-white transition focus-within:border-green-500">
            <input
              name="search"
              type="text"
              placeholder="Search for anything..."
              className="min-w-0 w-full bg-transparent px-4 py-2.5 outline-none sm:px-5 sm:py-3"
            />

            <button
              type="submit"
              className="flex shrink-0 items-center gap-2 bg-green-600 px-4 font-bold text-white transition hover:bg-green-700 sm:px-6"
            >
              <Search size={18} />
              <span className="hidden sm:inline">Search</span>
            </button>
          </div>
        </form>

        <div className="order-2 ml-auto flex min-w-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2 lg:order-none lg:flex-nowrap lg:gap-3">
          <Link
            to="/sell"
            className="shrink-0 rounded-xl bg-green-600 px-3 py-2 text-sm font-black text-white transition hover:bg-green-700 sm:px-4 lg:rounded-2xl lg:px-6 lg:py-3 lg:text-base"
          >
            Sell
          </Link>

          {!currentUser && (
            <div className="flex min-w-0 shrink-0 items-center gap-1.5 lg:hidden">
              <Link
                to="/login"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 px-3 text-sm font-black text-slate-700 transition hover:border-green-500 hover:text-green-600"
              >
                Login
              </Link>

              <Link
                to="/register"
                className="inline-flex h-10 items-center justify-center rounded-xl bg-green-600 px-3 text-sm font-black text-white transition hover:bg-green-700"
              >
                Register
              </Link>
            </div>
          )}

          <Link
            to={currentUser ? "/favorites" : "/login"}
            className={`group shrink-0 flex-col items-center ${
              currentUser ? "flex" : "hidden lg:flex"
            }`}
          >
            <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-red-50 hover:text-red-500 sm:h-11 sm:w-11">
              <Heart size={20} />
            </div>

            <span className="mt-1 hidden text-[11px] font-bold uppercase tracking-wide text-slate-500 transition group-hover:text-red-500 sm:block">
              Favourites
            </span>
          </Link>

          <Link
            to={currentUser ? "/chat" : "/login"}
            className={`group relative shrink-0 flex-col items-center ${
              currentUser ? "flex" : "hidden lg:flex"
            }`}
          >
            <div className="relative grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-red-50 hover:text-red-500 sm:h-11 sm:w-11">
              <MessageCircle size={20} />

              {currentUser && chatCount > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
                  {chatCount > 9 ? "9+" : chatCount}
                </span>
              )}
            </div>

            <span className="mt-1 hidden text-[11px] font-bold uppercase tracking-wide text-slate-500 transition group-hover:text-red-500 sm:block">
              Chat
            </span>
          </Link>

          <Link
            to={currentUser ? "/alerts" : "/login"}
            className={`group relative shrink-0 flex-col items-center ${
              currentUser ? "flex" : "hidden lg:flex"
            }`}
          >
            <div className="relative grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-red-50 hover:text-red-500 sm:h-11 sm:w-11">
              <Bell size={20} />

              {currentUser && alertCount > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
                  {alertCount > 9 ? "9+" : alertCount}
                </span>
              )}
            </div>

            <span className="mt-1 hidden text-[11px] font-bold uppercase tracking-wide text-slate-500 transition group-hover:text-red-500 sm:block">
              Alerts
            </span>
          </Link>

          {currentUser ? (
            <Link to="/profile" className="group flex shrink-0 flex-col items-center">
              {profilePhoto ? (
                <img
                  src={profilePhoto}
                  alt="profile"
                  className="h-10 w-10 rounded-full border-2 border-slate-200 object-cover transition group-hover:border-green-500 sm:h-12 sm:w-12"
                />
              ) : (
                <div className="grid h-10 w-10 place-items-center rounded-full border-2 border-slate-200 bg-red-500 text-base font-black text-white transition group-hover:border-green-500 sm:h-12 sm:w-12 sm:text-lg">
                  {avatarInitial}
                </div>
              )}

              <span className="mt-1 hidden text-[11px] font-bold uppercase tracking-wide text-slate-500 transition group-hover:text-green-600 sm:block">
                Profile
              </span>
            </Link>
          ) : (
            <div className="hidden items-center gap-3 lg:flex">
              <Link
                to="/login"
                className="font-bold text-slate-700 transition hover:text-green-600"
              >
                Login
              </Link>

              <Link
                to="/register"
                className="rounded-2xl bg-green-600 px-5 py-3 font-bold text-white transition hover:bg-green-700"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
