import { useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import {
  onDisconnect,
  onValue,
  ref as databaseRef,
  serverTimestamp as databaseServerTimestamp,
  set as setDatabase,
} from "firebase/database";
import { auth, db, rtdb } from "../firebase/firebase";
import { AuthContext } from "./AuthContext";

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [userRole, setUserRole] = useState("user");
  const [roleLoading, setRoleLoading] = useState(false);
  const [roleError, setRoleError] = useState("");
  const [loading, setLoading] = useState(true);

  function register(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  async function logout() {
    if (auth.currentUser) {
      await setDatabase(
        databaseRef(rtdb, `status/${auth.currentUser.uid}`),
        {
          state: "offline",
          lastChanged: databaseServerTimestamp(),
        }
      );

      await setDoc(
        doc(db, "users", auth.currentUser.uid),
        {
          online: false,
          lastSeen: serverTimestamp(),
        },
        { merge: true }
      );
    }

    return signOut(auth);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (!user) {
        setUserData(null);
        setUserRole("user");
        setRoleError("");
        setRoleLoading(false);
        setLoading(false);
        return;
      }

      setRoleLoading(true);

      if (user) {
        try {
          await setDoc(
            doc(db, "users", user.uid),
            {
              online: true,
              lastActiveAt: serverTimestamp(),
              email: user.email,
            },
            { merge: true }
          );
        } catch (err) {
          console.error("Auth user sync error:", err);
          setRoleError("We could not sync your account profile.");
        }
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const userRef = doc(db, "users", currentUser.uid);

    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        const data = snapshot.exists() ? snapshot.data() : {};
        const role = data.role === "admin" ? "admin" : "user";

        setUserData(data);
        setUserRole(role);
        setRoleError("");
        setRoleLoading(false);
      },
      (err) => {
        console.error("User role fetch error:", err);
        setUserData(null);
        setUserRole("user");
        setRoleError("We could not load your account role.");
        setRoleLoading(false);
      }
    );

    return unsubscribe;
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    const userRef = doc(db, "users", currentUser.uid);
    const connectedRef = databaseRef(rtdb, ".info/connected");
    const userStatusRef = databaseRef(rtdb, `status/${currentUser.uid}`);

    function markFirestoreOnline() {
      return setDoc(
        userRef,
        {
          online: true,
          lastActiveAt: serverTimestamp(),
          email: currentUser.email,
        },
        { merge: true }
      );
    }

    function markFirestoreOffline() {
      return setDoc(
        userRef,
        {
          online: false,
          lastSeen: serverTimestamp(),
        },
        { merge: true }
      );
    }

    const onlineStatus = {
      state: "online",
      lastChanged: databaseServerTimestamp(),
    };

    const offlineStatus = {
      state: "offline",
      lastChanged: databaseServerTimestamp(),
    };

    function touchFirestoreOnline() {
      markFirestoreOnline().catch((err) => {
        console.error("Presence online update error:", err);
      });
    }

    function markOfflineBestEffort() {
      setDatabase(userStatusRef, offlineStatus).catch((err) => {
        console.error("Presence offline status update error:", err);
      });

      markFirestoreOffline().catch((err) => {
        console.error("Presence offline update error:", err);
      });
    }

    async function markRealtimeOnline() {
      await onDisconnect(userStatusRef).set(offlineStatus);
      await setDatabase(userStatusRef, onlineStatus);
      await markFirestoreOnline();
    }

    const unsubscribeConnection = onValue(connectedRef, (snapshot) => {
      if (snapshot.val() !== true) {
        return;
      }

      markRealtimeOnline().catch((err) => {
        console.error("Realtime presence error:", err);
      });
    });

    touchFirestoreOnline();

    const interval = setInterval(touchFirestoreOnline, 60000);

    function handleVisibilityChange() {
      if (!document.hidden) {
        touchFirestoreOnline();
      }
    }

    window.addEventListener("focus", touchFirestoreOnline);
    window.addEventListener("online", touchFirestoreOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      unsubscribeConnection();
      window.removeEventListener("focus", touchFirestoreOnline);
      window.removeEventListener("online", touchFirestoreOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      markOfflineBestEffort();
    };
  }, [currentUser]);

  const value = {
    currentUser,
    userData,
    userRole,
    roleLoading,
    roleError,
    isAdmin: Boolean(currentUser && userRole === "admin"),
    isMarketplaceUser: Boolean(currentUser && userRole === "user"),
    register,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
