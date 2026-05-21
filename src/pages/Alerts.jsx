import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { Bell, CheckCircle2, Loader2 } from "lucide-react";
import { db } from "../firebase/firebase";
import { useAuth } from "../context/AuthContext";

function Alerts() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState("");
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    const alertsQuery = query(
      collection(db, "users", currentUser.uid, "alerts"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(alertsQuery, (snapshot) => {
      const items = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      setAlerts(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, navigate]);

  async function openAlert(alert) {
    await updateDoc(doc(db, "users", currentUser.uid, "alerts", alert.id), {
      read: true,
    });

    if (alert.chatId) {
      navigate(`/chat/${alert.chatId}`);
      return;
    }

    if (alert.productId) {
      navigate(`/product/${alert.productId}`);
      return;
    }
  }

  async function markAllAsRead() {
    const unreadAlerts = alerts.filter((alert) => !alert.read);

    if (unreadAlerts.length === 0) return;

    try {
      setMarkingAll(true);

      await Promise.all(
        unreadAlerts.map((alert) =>
          updateDoc(doc(db, "users", currentUser.uid, "alerts", alert.id), {
            read: true,
          })
        )
      );
    } catch (err) {
      console.error("Mark all alerts error:", err);
    } finally {
      setMarkingAll(false);
    }
  }

  async function markAlertAsRead(alert) {
    if (alert.read) return;

    try {
      setMarkingId(alert.id);

      await updateDoc(doc(db, "users", currentUser.uid, "alerts", alert.id), {
        read: true,
      });
    } catch (err) {
      console.error("Mark alert error:", err);
    } finally {
      setMarkingId("");
    }
  }

  if (!currentUser) return null;

  const hasUnread = alerts.some((item) => !item.read);

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-950 sm:text-4xl">
              Alerts
            </h1>
          </div>

          {alerts.length > 0 && (
            <button
              onClick={markAllAsRead}
              disabled={!hasUnread || markingAll}
              className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-3 font-black text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60 sm:px-5"
            >
              {markingAll ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <CheckCircle2 size={18} />
              )}
              {hasUnread ? "Mark all read" : "All read"}
            </button>
          )}
        </div>

        {loading ? (
          <p className="py-20 text-center font-bold text-slate-500">
            Loading alerts...
          </p>
        ) : alerts.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-6 py-20 text-center">
            <Bell className="mx-auto text-slate-300" size={54} />

            <h2 className="mt-5 text-2xl font-black text-slate-900">
              No alerts yet
            </h2>

            <p className="mt-2 text-slate-500">
              New messages and marketplace alerts will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`flex flex-col gap-4 rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:flex-row sm:items-start ${
                  alert.read
                    ? "border-slate-200 bg-white"
                    : "border-green-200 bg-green-50"
                }`}
              >
                <button
                  type="button"
                  onClick={() => openAlert(alert)}
                  className="flex min-w-0 flex-1 items-start gap-4 text-left"
                >
                  <div
                    className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${
                      alert.read
                        ? "bg-slate-100 text-slate-500"
                        : "bg-green-600 text-white"
                    }`}
                  >
                    <Bell size={20} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="break-words font-black text-slate-900">
                        {alert.title || "New alert"}
                      </h2>

                      {!alert.read && (
                        <span className="rounded-full bg-red-500 px-2 py-1 text-[10px] font-black uppercase text-white">
                          New
                        </span>
                      )}
                    </div>

                    <p className="mt-1 break-words text-sm font-semibold text-slate-600">
                      {alert.message}
                    </p>

                    <p className="mt-3 text-xs font-bold text-slate-400">
                      {alert.createdAt?.toDate
                        ? alert.createdAt.toDate().toLocaleString()
                        : "Just now"}
                    </p>
                  </div>
                </button>

                <div className="flex shrink-0 items-center justify-end">
                  {alert.read ? (
                    <span className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-500">
                      <CheckCircle2 size={16} />
                      Read
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => markAlertAsRead(alert)}
                      disabled={markingId === alert.id}
                      className="inline-flex items-center gap-2 rounded-xl border border-green-200 bg-white px-4 py-2 text-sm font-black text-green-700 transition hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {markingId === alert.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={16} />
                      )}
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <Link
          to="/"
          className="mt-8 inline-block font-bold text-green-600 hover:underline"
        >
          Back home
        </Link>
      </div>
    </main>
  );
}

export default Alerts;
