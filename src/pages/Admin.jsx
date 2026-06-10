import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import {
  Ban,
  Loader2,
  LockOpen,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";

import { db } from "../firebase/firebase";
import { useAuth } from "../context/AuthContext";

function formatPrice(price) {
  const amount = Number(price);

  if (!Number.isFinite(amount) || amount <= 0) {
    return "Price on request";
  }

  return `\u20a6${amount.toLocaleString()}`;
}

function Admin() {
  const { currentUser } = useAuth();

  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userRole, setUserRole] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState("products");
  const [deletingProductId, setDeletingProductId] = useState("");
  const [updatingUserId, setUpdatingUserId] = useState("");

  useEffect(() => {
    if (!currentUser) return;

    let ignore = false;

    async function fetchAdminData() {
      try {
        setLoading(true);
        setError("");
        setIsAdmin(false);

        const currentUserSnap = await getDoc(
          doc(db, "users", currentUser.uid)
        );
        const currentUserData = currentUserSnap.exists()
          ? currentUserSnap.data()
          : {};
        const role = currentUserData.role || "user";

        if (ignore) return;

        setUserRole(role);

        if (role !== "admin") {
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        const [productSnap, userSnap] = await Promise.all([
          getDocs(collection(db, "products")),
          getDocs(collection(db, "users")),
        ]);

        if (ignore) return;

        setProducts(
          productSnap.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }))
        );
        setUsers(
          userSnap.docs.map((item) => {
            const data = item.data();

            return {
              id: item.id,
              ...data,
              role: data.role || "user",
            };
          })
        );
        setIsAdmin(true);
      } catch (err) {
        console.error("Admin data error:", err);

        if (!ignore) {
          setError(
            "We could not verify admin access or load admin data. Please try again."
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    fetchAdminData();

    return () => {
      ignore = true;
    };
  }, [currentUser]);

  async function handleDeleteProduct(id) {
    if (deletingProductId) return;

    const confirmDelete = window.confirm("Delete this product?");
    if (!confirmDelete) return;

    try {
      setError("");
      setDeletingProductId(id);
      await deleteDoc(doc(db, "products", id));
      setProducts((currentProducts) =>
        currentProducts.filter((product) => product.id !== id)
      );
    } catch (err) {
      console.error("Admin delete product error:", err);
      setError("Failed to delete this product. Please try again.");
    } finally {
      setDeletingProductId("");
    }
  }

  async function handleToggleUserBlock(user) {
    if (!user?.id || updatingUserId) return;

    if (user.id === currentUser.uid) {
      setError("You cannot block your own admin account.");
      return;
    }

    const nextBlockedState = user.blocked !== true;
    const confirmAction = window.confirm(
      `${nextBlockedState ? "Block" : "Unblock"} ${
        user.email || user.username || "this user"
      }?`
    );

    if (!confirmAction) return;

    try {
      setError("");
      setUpdatingUserId(user.id);

      await updateDoc(doc(db, "users", user.id), {
        blocked: nextBlockedState,
        ...(nextBlockedState
          ? { blockedAt: serverTimestamp(), blockedBy: currentUser.uid }
          : { unblockedAt: serverTimestamp(), unblockedBy: currentUser.uid }),
      });

      setUsers((currentUsers) =>
        currentUsers.map((item) =>
          item.id === user.id
            ? {
                ...item,
                blocked: nextBlockedState,
              }
            : item
        )
      );
    } catch (err) {
      console.error("Admin user block update error:", err);
      setError("Failed to update this user. Please try again.");
    } finally {
      setUpdatingUserId("");
    }
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center overflow-x-hidden bg-slate-50 px-4 py-10">
        <div className="flex items-center gap-3 rounded-2xl border border-green-100 bg-white px-6 py-5 font-black text-slate-600 shadow-sm">
          <Loader2 size={22} className="animate-spin text-green-600" />
          Checking admin access...
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center overflow-x-hidden bg-slate-50 px-4 py-10">
        <section className="w-full max-w-lg rounded-[1.5rem] border border-red-200 bg-white p-6 text-center shadow-sm sm:rounded-[2rem] sm:p-8">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-red-50 text-red-600">
            <ShieldAlert size={34} />
          </div>

          <h1 className="mt-5 text-3xl font-black text-slate-950">
            Access Denied
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            Your account is signed in as a {userRole || "user"}. Only users
            with the admin role can open the Sellify admin dashboard.
          </p>

          {error && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-600">
              {error}
            </div>
          )}

          <Link
            to="/"
            className="mt-6 inline-flex items-center justify-center rounded-2xl bg-green-600 px-5 py-3 font-black text-white transition hover:bg-green-700"
          >
            Back to Sellify
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-green-600">
              Admin dashboard
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Sellify Admin Panel
            </h1>

            <p className="mt-2 break-all text-slate-500">
              Signed in as {currentUser.email}
            </p>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-2xl border border-green-100 bg-green-50 px-4 py-3 font-black text-green-700">
            <ShieldCheck size={18} />
            Admin
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}

        <div className="mb-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setTab("products")}
            className={`rounded-2xl px-5 py-3 font-black transition ${
              tab === "products"
                ? "bg-green-600 text-white"
                : "border border-slate-200 bg-white text-slate-700 hover:border-green-200 hover:bg-green-50"
            }`}
          >
            Products ({products.length})
          </button>

          <button
            type="button"
            onClick={() => setTab("users")}
            className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 font-black transition ${
              tab === "users"
                ? "bg-green-600 text-white"
                : "border border-slate-200 bg-white text-slate-700 hover:border-green-200 hover:bg-green-50"
            }`}
          >
            <Users size={18} />
            Users ({users.length})
          </button>
        </div>

        {tab === "products" ? (
          <section className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-3 text-left">Title</th>
                    <th className="p-3 text-left">Price</th>
                    <th className="p-3 text-left">Category</th>
                    <th className="p-3 text-left">Location</th>
                    <th className="p-3 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-t border-slate-100">
                      <td className="p-3 font-semibold text-slate-900">
                        {product.title || "Untitled product"}
                      </td>
                      <td className="p-3 font-black text-green-600">
                        {formatPrice(product.price)}
                      </td>
                      <td className="p-3 text-slate-600">
                        {product.category || "General"}
                      </td>
                      <td className="p-3 text-slate-600">
                        {product.location || "No location"}
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(product.id)}
                          disabled={Boolean(deletingProductId)}
                          className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingProductId === product.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <section className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-3 text-left">Name</th>
                    <th className="p-3 text-left">Email</th>
                    <th className="p-3 text-left">Phone</th>
                    <th className="p-3 text-left">Role</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="p-3 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-t border-slate-100">
                      <td className="p-3 font-semibold text-slate-900">
                        {user.name || user.username || "Unnamed user"}
                      </td>
                      <td className="p-3 text-slate-600">
                        {user.email || "No email"}
                      </td>
                      <td className="p-3 text-slate-600">
                        {user.phone || "No phone"}
                      </td>
                      <td className="p-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black capitalize ${
                            user.role === "admin"
                              ? "bg-green-50 text-green-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {user.role || "user"}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${
                            user.blocked === true
                              ? "bg-red-50 text-red-600"
                              : "bg-green-50 text-green-700"
                          }`}
                        >
                          {user.blocked === true ? "Blocked" : "Active"}
                        </span>
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => handleToggleUserBlock(user)}
                          disabled={
                            Boolean(updatingUserId) ||
                            user.id === currentUser.uid
                          }
                          className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${
                            user.blocked === true
                              ? "bg-green-50 text-green-700 hover:bg-green-100"
                              : "bg-red-50 text-red-600 hover:bg-red-100"
                          }`}
                        >
                          {updatingUserId === user.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : user.blocked === true ? (
                            <LockOpen size={14} />
                          ) : (
                            <Ban size={14} />
                          )}
                          {user.blocked === true ? "Unblock" : "Block"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

export default Admin;
