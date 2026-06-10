import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { LISTING_CATEGORIES } from "../utils/categories";

const CLOUDINARY_CLOUD_NAME = "dy8l18zvz";
const CLOUDINARY_UPLOAD_PRESET = "sellify_uploads";

function SellProduct() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);

  const [form, setForm] = useState({
    title: "",
    price: "",
    category: "Phones",
    location: "",
    address: "",
    description: "",
    phone: "",
    stock: "1",

    brand: "",
    model: "",
    condition: "",
    storage: "",
    ram: "",

    size: "",
    gender: "",

    make: "",
    year: "",
    mileage: "",

    breed: "",
    age: "",

    bedrooms: "",
    bathrooms: "",
  });

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  function handleImageChange(e) {
  const newFiles = Array.from(e.target.files);

  const combinedFiles = [...imageFiles, ...newFiles];

   if (combinedFiles.length > 5) {
      setError("You can only upload up to 5 images.");
      return;
    }

    setError("");

    setImageFiles(combinedFiles);
    setImagePreviews(combinedFiles.map((file) => URL.createObjectURL(file)));

     e.target.value = "";
    }
  function removeImage(index) {
    const updatedFiles = imageFiles.filter((_, i) => i !== index);
    const updatedPreviews = imagePreviews.filter((_, i) => i !== index);

    setImageFiles(updatedFiles);
    setImagePreviews(updatedPreviews);
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

  async function uploadAllImages() {
    const uploadedImages = [];

    for (const file of imageFiles) {
      const imageUrl = await uploadToCloudinary(file);
      uploadedImages.push(imageUrl);
    }

    return uploadedImages;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (loading) return;

    if (!currentUser) {
      setError("You must be logged in.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const uploadedImages = await uploadAllImages();

      await addDoc(collection(db, "products"), {
        ...form,

        price: Number(form.price),
        stock: Math.max(0, Number(form.stock) || 0),
        listingStatus: "active",

        imageUrl: uploadedImages[0] || "",
        images: uploadedImages,

        sellerId: currentUser.uid,
        sellerEmail: currentUser.email,
        sellerName:
          currentUser.displayName ||
          currentUser.email?.split("@")[0] ||
          "Seller",

        sold: false,

        createdAt: serverTimestamp(),
      });

      navigate("/browse");
    } catch (err) {
      console.error(err);
      setError(
        "Failed to post listing. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function renderCategoryFields() {
    switch (form.category) {
      case "Phones":
      case "Electronics":
        return (
          <>
            <InputField label="Brand" name="brand" value={form.brand} onChange={handleChange} placeholder="e.g Apple" />
            <InputField label="Model" name="model" value={form.model} onChange={handleChange} placeholder="e.g iPhone 13 Pro" />
            <InputField label="Storage" name="storage" value={form.storage} onChange={handleChange} placeholder="e.g 256GB" />
            <InputField label="RAM" name="ram" value={form.ram} onChange={handleChange} placeholder="e.g 8GB" />
            <InputField label="Condition" name="condition" value={form.condition} onChange={handleChange} placeholder="e.g Brand New" />
          </>
        );

      case "Fashion":
        return (
          <>
            <InputField label="Brand" name="brand" value={form.brand} onChange={handleChange} placeholder="e.g Nike" />
            <InputField label="Size" name="size" value={form.size} onChange={handleChange} placeholder="e.g XL" />
            <InputField label="Gender" name="gender" value={form.gender} onChange={handleChange} placeholder="Men / Women / Unisex" />
            <InputField label="Condition" name="condition" value={form.condition} onChange={handleChange} placeholder="e.g Used once" />
          </>
        );

      case "Vehicles":
        return (
          <>
            <InputField label="Make" name="make" value={form.make} onChange={handleChange} placeholder="e.g Toyota" />
            <InputField label="Model" name="model" value={form.model} onChange={handleChange} placeholder="e.g Camry" />
            <InputField label="Year" name="year" value={form.year} onChange={handleChange} placeholder="e.g 2018" />
            <InputField label="Mileage" name="mileage" value={form.mileage} onChange={handleChange} placeholder="e.g 80,000km" />
          </>
        );

      case "Pets":
        return (
          <>
            <InputField label="Breed" name="breed" value={form.breed} onChange={handleChange} placeholder="e.g German Shepherd" />
            <InputField label="Age" name="age" value={form.age} onChange={handleChange} placeholder="e.g 2 years" />
            <InputField label="Gender" name="gender" value={form.gender} onChange={handleChange} placeholder="Male / Female" />
          </>
        );

      case "Property":
        return (
          <>
            <InputField label="Bedrooms" name="bedrooms" value={form.bedrooms} onChange={handleChange} placeholder="e.g 4" />
            <InputField label="Bathrooms" name="bathrooms" value={form.bathrooms} onChange={handleChange} placeholder="e.g 3" />
          </>
        );

      default:
        return (
          <InputField
            label="Condition"
            name="condition"
            value={form.condition}
            onChange={handleChange}
            placeholder="e.g Brand New"
          />
        );
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm sm:rounded-[2rem]">
        <div className="border-b border-slate-100 bg-gradient-to-r from-green-50 via-white to-green-100 px-5 py-6 sm:px-8 sm:py-8">
          <p className="text-sm font-black uppercase tracking-widest text-green-600">
            Sell on Sellify
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Post a new listing
          </h1>

          <p className="mt-3 max-w-2xl text-slate-500">
            Upload up to 5 photos and start receiving messages from buyers instantly.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid gap-6 px-5 py-6 sm:px-8 sm:py-8 lg:grid-cols-[1fr_0.9fr] lg:gap-8"
        >
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 p-4 sm:p-6">
              <h2 className="text-xl font-black text-slate-900">
                Listing details
              </h2>

              <div className="mt-6 space-y-5">
                <InputField
                  label="Product title"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="e.g iPhone 13 Pro Max"
                />

                <div className="grid gap-5 md:grid-cols-2">
                  <InputField
                    label="Price"
                    name="price"
                    value={form.price}
                    onChange={handleChange}
                    placeholder="e.g 500000"
                    type="number"
                  />

                  <InputField
                    label="Available stock"
                    name="stock"
                    value={form.stock}
                    onChange={handleChange}
                    placeholder="e.g 1"
                    type="number"
                  />
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Category
                    </label>

                    <select
                      name="category"
                      value={form.category}
                      onChange={handleChange}
                      className="w-full rounded-2xl border border-slate-300 px-5 py-4 outline-none transition focus:border-green-500"
                    >
                      {LISTING_CATEGORIES.map((cat) => (
                        <option key={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  {renderCategoryFields()}
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <InputField
                    label="Location"
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                    placeholder="e.g Lagos"
                  />

                  <InputField
                    label="Phone"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="e.g 08012345678"
                  />
                </div>

                <InputField
                  label="Address / Store location"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="e.g Lekki Phase 1"
                />

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Description
                  </label>

                  <textarea
                    name="description"
                    rows="6"
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Describe your item..."
                    className="w-full rounded-2xl border border-slate-300 px-5 py-4 outline-none transition focus:border-green-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 p-4 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-black text-slate-900">
                  Product images
                </h2>

                <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700">
                  {imageFiles.length}/5
                </span>
              </div>

              <div className="mt-6 rounded-3xl border-2 border-dashed border-slate-300 p-5 text-center transition hover:border-green-400">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  id="imageUpload"
                  className="hidden"
                  onChange={handleImageChange}
                  disabled={loading}
                />

                <label
                  htmlFor="imageUpload"
                  className="cursor-pointer"
                >
                  <div className="text-6xl">📸</div>

                  <p className="mt-3 font-bold text-slate-700">
                    Upload product photos
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    PNG, JPG supported. Maximum 5 images.
                  </p>

                  <span className="mt-5 inline-block rounded-2xl bg-green-600 px-6 py-3 font-bold text-white transition hover:bg-green-700">
                    Choose images
                  </span>
                </label>
              </div>

              {imagePreviews.length > 0 && (
                <div className="mt-5 grid grid-cols-2 gap-3">
                  {imagePreviews.map((preview, index) => (
                    <div
                      key={preview}
                      className="relative overflow-hidden rounded-2xl border border-slate-200"
                    >
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="h-36 w-full object-cover"
                      />

                      {index === 0 && (
                        <span className="absolute left-2 top-2 rounded-full bg-green-600 px-3 py-1 text-xs font-black text-white">
                          Cover
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        disabled={loading}
                        className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-red-500 text-sm font-black text-white shadow"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-green-600 py-4 text-lg font-black text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Posting listing..." : "Post listing"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

function InputField({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-700">
        {label}
      </label>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-300 px-5 py-4 outline-none transition focus:border-green-500"
      />
    </div>
  );
}

export default SellProduct;
