import { useState, useEffect } from "react";
import { db } from "../firebase/firebase";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

function Admin() {
  const { currentUser } = useAuth();
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("products");

  useEffect(() => {
    async function fetchData() {
      try {
        const productSnap = await getDocs(collection(db, "products"));
        setProducts(productSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));

        const userSnap = await getDocs(collection(db, "users"));
        setUsers(userSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching data:", error);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  async function handleDeleteProduct(id) {
    if (window.confirm("Delete this product?")) {
      await deleteDoc(doc(db, "products", id));
      setProducts(products.filter((p) => p.id !== id));
    }
  }

  if (!currentUser) return <p className="text-center py-20">Access denied.</p>;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Admin Panel</h1>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setTab("products")}
            className={`px-4 py-2 rounded font-semibold ${tab === "products" ? "bg-green-600 text-white" : "bg-white text-gray-700 border"}`}
          >
            Products ({products.length})
          </button>
          <button
            onClick={() => setTab("users")}
            className={`px-4 py-2 rounded font-semibold ${tab === "users" ? "bg-green-600 text-white" : "bg-white text-gray-700 border"}`}
          >
            Users ({users.length})
          </button>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : tab === "products" ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left p-3">Title</th>
                  <th className="text-left p-3">Price</th>
                  <th className="text-left p-3">Category</th>
                  <th className="text-left p-3">Location</th>
                  <th className="text-left p-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="p-3">{p.title}</td>
                    <td className="p-3">₦{p.price?.toLocaleString()}</td>
                    <td className="p-3">{p.category}</td>
                    <td className="p-3">{p.location}</td>
                    <td className="p-3">
                      <button
                        onClick={() => handleDeleteProduct(p.id)}
                        className="bg-red-100 text-red-600 px-3 py-1 rounded hover:bg-red-200 text-xs"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Email</th>
                  <th className="text-left p-3">Phone</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="p-3">{u.name}</td>
                    <td className="p-3">{u.email}</td>
                    <td className="p-3">{u.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Admin;