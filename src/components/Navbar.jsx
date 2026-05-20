import { useEffect, useState } from "react";
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
import { collection, doc, getDoc, onSnapshot } from "firebase/firestore";
import { LISTING_CATEGORIES } from "../utils/categories";

function Navbar() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [profilePhoto, setProfilePhoto] = useState("");
  const [profileName, setProfileName] = useState("");
  const [profileUsername, setProfileUsername] = useState("");
  const [showCategories, setShowCategories] = useState(false);

  const [chatCount, setChatCount] = useState(0);
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    async function fetchProfile() {
      if (!currentUser) {
        setProfilePhoto("");
        setProfileName("");
        setProfileUsername("");
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", currentUser.uid));

        if (snap.exists()) {
          const data = snap.data();

          setProfilePhoto(data.photoUrl || "");
          setProfileName(data.name || "");
          setProfileUsername(data.username || "");
        }
      } catch (err) {
        console.error("Navbar profile fetch error:", err);
      }
    }

    fetchProfile();
  }, [currentUser]);

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
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-5 py-4">
        <Link to="/" className="flex shrink-0 items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-green-600 text-xl font-black text-white shadow-sm">
            S
          </div>

          <div className="leading-none">
            <div className="text-2xl font-black tracking-tight text-black">
              ellify
            </div>

            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.25em] text-slate-400">
              Marketplace
            </p>
          </div>
        </Link>

        <div className="relative hidden lg:block">
          <button
            onClick={() => setShowCategories(!showCategories)}
            className="flex items-center gap-2 rounded-2xl border border-slate-300 px-4 py-3 font-bold text-slate-700 transition hover:border-green-500 hover:text-green-600"
          >
            <Menu size={18} />
            Categories
            <ChevronDown
              size={17}
              className={`transition ${showCategories ? "rotate-180" : ""}`}
            />
          </button>

          {showCategories && (
            <div className="absolute left-0 top-16 z-50 w-72 rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl">
              <div className="grid grid-cols-2 gap-2">
                {LISTING_CATEGORIES.map((category) => (
                  <button
                    key={category}
                    onClick={() => goToCategory(category)}
                    className="rounded-xl px-3 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-green-50 hover:text-green-600"
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSearch} className="hidden flex-1 lg:block">
          <div className="flex overflow-hidden rounded-2xl border-2 border-slate-300 bg-white transition focus-within:border-green-500">
            <input
              name="search"
              type="text"
              placeholder="Search for anything..."
              className="w-full bg-transparent px-5 py-3 outline-none"
            />

            <button
              type="submit"
              className="flex items-center gap-2 bg-green-600 px-6 font-bold text-white transition hover:bg-green-700"
            >
              <Search size={18} />
              Search
            </button>
          </div>
        </form>

        <div className="ml-auto flex items-center gap-3">
          <Link
            to="/sell"
            className="hidden rounded-2xl bg-green-600 px-6 py-3 font-black text-white transition hover:bg-green-700 lg:block"
          >
            Sell
          </Link>

          <Link
            to={currentUser ? "/favorites" : "/login"}
            className="group flex flex-col items-center"
          >
            <div className="grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-red-50 hover:text-red-500">
              <Heart size={20} />
            </div>

            <span className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-500 transition group-hover:text-red-500">
              Favourites
            </span>
          </Link>

          <Link
            to={currentUser ? "/chat" : "/login"}
            className="group relative flex flex-col items-center"
          >
            <div className="relative grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-red-50 hover:text-red-500">
              <MessageCircle size={20} />

              {currentUser && chatCount > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
                  {chatCount > 9 ? "9+" : chatCount}
                </span>
              )}
            </div>

            <span className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-500 transition group-hover:text-red-500">
              Chat
            </span>
          </Link>

          <Link
            to={currentUser ? "/alerts" : "/login"}
            className="group relative flex flex-col items-center"
          >
            <div className="relative grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-red-50 hover:text-red-500">
              <Bell size={20} />

              {currentUser && alertCount > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
                  {alertCount > 9 ? "9+" : alertCount}
                </span>
              )}
            </div>

            <span className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-500 transition group-hover:text-red-500">
              Alerts
            </span>
          </Link>

          {currentUser ? (
            <Link to="/profile" className="group flex flex-col items-center">
              {profilePhoto ? (
                <img
                  src={profilePhoto}
                  alt="profile"
                  className="h-12 w-12 rounded-full border-2 border-slate-200 object-cover transition group-hover:border-green-500"
                />
              ) : (
                <div className="grid h-12 w-12 place-items-center rounded-full border-2 border-slate-200 bg-red-500 text-lg font-black text-white transition group-hover:border-green-500">
                  {avatarInitial}
                </div>
              )}

              <span className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-500 transition group-hover:text-green-600">
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
