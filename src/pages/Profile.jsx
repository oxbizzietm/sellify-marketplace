import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

import { db } from "../firebase/firebase";
import { useAuth } from "../context/AuthContext";

const CLOUDINARY_CLOUD_NAME = "dy8l18zvz";
const CLOUDINARY_UPLOAD_PRESET = "sellify_uploads";

function Profile() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [myListings, setMyListings] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchProfile() {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        const userSnap = await getDoc(doc(db, "users", currentUser.uid));

        if (userSnap.exists()) {
          const data = userSnap.data();

          setName(data.name || "");
          setPhone(data.phone || "");
          setUsername(data.username || "");
          setPhotoUrl(data.photoUrl || "");
        }

        const q = query(
          collection(db, "products"),
          where("sellerId", "==", currentUser.uid)
        );

        const snap = await getDocs(q);

        const items = snap.docs
          .map((item) => ({
            id: item.id,
            ...item.data(),
          }))
          .sort((a, b) => {
            const aTime = a.createdAt?.toMillis?.() || 0;
            const bTime = b.createdAt?.toMillis?.() || 0;
            return bTime - aTime;
          });

        setMyListings(items);
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [currentUser]);

  function handleImageChange(e) {
    const file = e.target.files[0];

    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  }

  async function uploadToCloudinary(file) {
    const formData = new FormData();

    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Cloudinary upload failed");
    }

    return data.secure_url;
  }

  async function handleUpdate(e) {
    e.preventDefault();

    if (!currentUser) {
      setError("You must be logged in.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const cleanUsername = username.toLowerCase().trim();

      const usernameQuery = query(
        collection(db, "users"),
        where("username", "==", cleanUsername)
      );

      const usernameSnap = await getDocs(usernameQuery);

      let usernameTaken = false;

      usernameSnap.forEach((userDoc) => {
        if (userDoc.id !== currentUser.uid) {
          usernameTaken = true;
        }
      });

      if (usernameTaken) {
        setError("Username already taken.");
        setSaving(false);
        return;
      }

      let finalPhotoUrl = photoUrl;

      if (imageFile) {
        finalPhotoUrl = await uploadToCloudinary(imageFile);
      }

      await setDoc(
        doc(db, "users", currentUser.uid),
        {
          name,
          phone,
          username: cleanUsername,
          photoUrl: finalPhotoUrl,
          email: currentUser.email,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      setPhotoUrl(finalPhotoUrl);
      setImageFile(null);
      setImagePreview(null);

      setSuccess("Profile updated successfully!");
    } catch (err) {
      console.error(err);
      setError("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      console.error(err);
      setError("Failed to logout.");
    }
  }

  const activeListings = myListings.filter((item) => item.sold !== true);
  const soldListings = myListings.filter((item) => item.sold === true);

  const avatarUrl =
    imagePreview ||
    photoUrl ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${
      username || name || "user"
    }`;

  if (!currentUser) {
    return (
      <p className="py-20 text-center">
        Please login to view your profile.
      </p>
    );
  }

  if (loading) {
    return <p className="py-20 text-center">Loading profile...</p>;
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 px-4 py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 lg:flex-row">
        <div className="w-full space-y-5 lg:w-80">
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 text-center shadow-sm sm:rounded-[2rem] sm:p-7">
            <div className="relative inline-block">
              <img
                src={avatarUrl}
                alt="Profile"
                className="h-28 w-28 rounded-full border-4 border-green-100 bg-slate-100 object-cover"
              />

              <label
                htmlFor="avatarInput"
                className="absolute bottom-1 right-1 cursor-pointer rounded-full bg-green-600 p-2 text-white shadow-lg transition hover:bg-green-700"
              >
                ✏️
              </label>

              <input
                id="avatarInput"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>

            <h2 className="mt-5 text-2xl font-black text-slate-900">
              {name || "Sellify User"}
            </h2>

            {username && (
              <p className="mt-1 font-semibold text-green-600">@{username}</p>
            )}

            <p className="mt-2 break-all text-sm text-slate-400">
              {currentUser.email}
            </p>

            {phone && <p className="mt-2 text-sm text-slate-500">📞 {phone}</p>}

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-green-50 p-4">
                <p className="text-3xl font-black text-green-700">
                  {activeListings.length}
                </p>

                <p className="mt-1 text-sm font-semibold text-green-600">
                  Active
                </p>
              </div>

              <div className="rounded-2xl bg-red-50 p-4">
                <p className="text-3xl font-black text-red-600">
                  {soldListings.length}
                </p>

                <p className="mt-1 text-sm font-semibold text-red-500">
                  Sold
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[2rem] sm:p-5">
            <div className="space-y-2">
              <Link
                to="/dashboard"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-700 transition hover:bg-green-50 hover:text-green-600"
              >
                📋 My Dashboard
              </Link>

              <Link
                to="/chat"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-700 transition hover:bg-green-50 hover:text-green-600"
              >
                💬 My Messages
              </Link>

              <Link
                to="/sell"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-700 transition hover:bg-green-50 hover:text-green-600"
              >
                ➕ Post Listing
              </Link>

              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-red-500 transition hover:bg-red-50 hover:text-red-600"
              >
                🚪 Logout
              </button>
            </div>
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-6">
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm sm:rounded-[2rem] sm:p-7">
            <h3 className="text-2xl font-black text-slate-900">
              Edit Profile
            </h3>

            {success && (
              <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">
                {success}
              </div>
            )}

            {error && (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-600">
                {error}
              </div>
            )}

            {imageFile && (
              <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-600">
                📸 New profile photo selected.
              </div>
            )}

            <form onSubmit={handleUpdate} className="mt-6 space-y-5">
              <InputField
                label="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

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
                    value={username}
                    onChange={(e) =>
                      setUsername(
                        e.target.value.replace(/\s/g, "").toLowerCase()
                      )
                    }
                    className="min-w-0 w-full rounded-2xl border border-slate-300 py-4 pl-10 pr-5 outline-none transition focus:border-green-500"
                    required
                  />
                </div>
              </div>

              <InputField label="Email" value={currentUser.email} disabled />

              <InputField
                label="Phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-2xl bg-green-600 py-4 text-lg font-black text-white transition hover:bg-green-700 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Update Profile"}
              </button>
            </form>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm sm:rounded-[2rem] sm:p-7">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-2xl font-black text-slate-900">
                Active Listings
              </h3>

              <Link
                to="/dashboard"
                className="font-bold text-green-600 hover:underline"
              >
                View all →
              </Link>
            </div>

            {activeListings.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
                No active listings.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {activeListings.slice(0, 6).map((product) => (
                  <Link
                    key={product.id}
                    to={`/product/${product.id}`}
                    className="overflow-hidden rounded-2xl border border-slate-200 transition hover:-translate-y-1 hover:shadow-lg"
                  >
                    <img
                      src={
                        product.imageUrl ||
                        "https://placehold.co/600x400?text=Sellify"
                      }
                      alt={product.title}
                      className="h-40 w-full object-cover"
                    />

                    <div className="p-4">
                      <p className="truncate text-lg font-black text-slate-900">
                        {product.title}
                      </p>

                      <p className="mt-2 text-xl font-black text-green-600">
                        ₦{product.price?.toLocaleString()}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {soldListings.length > 0 && (
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm sm:rounded-[2rem] sm:p-7">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-2xl font-black text-slate-900">
                  Recently Sold
                </h3>

                <Link
                  to="/dashboard"
                  className="font-bold text-red-500 hover:underline"
                >
                  View sold →
                </Link>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {soldListings.slice(0, 3).map((product) => (
                  <Link
                    key={product.id}
                    to={`/product/${product.id}`}
                    className="overflow-hidden rounded-2xl border border-slate-200 transition hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="relative">
                      <img
                        src={
                          product.imageUrl ||
                          "https://placehold.co/600x400?text=Sellify"
                        }
                        alt={product.title}
                        className="h-40 w-full object-cover grayscale"
                      />

                      <div className="absolute inset-0 bg-black/20" />

                      <span className="absolute left-3 top-3 rounded-full bg-red-500 px-3 py-1 text-xs font-black text-white">
                        SOLD
                      </span>
                    </div>

                    <div className="p-4">
                      <p className="truncate text-lg font-black text-slate-900">
                        {product.title}
                      </p>

                      <p className="mt-2 text-xl font-black text-red-500">
                        SOLD
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, disabled = false }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-700">
        {label}
      </label>

      <input
        type="text"
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`min-w-0 w-full rounded-2xl border border-slate-300 px-5 py-4 outline-none transition ${
          disabled ? "bg-slate-100" : "focus:border-green-500"
        }`}
      />
    </div>
  );
}

export default Profile;
