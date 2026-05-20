import { useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
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

      if (user) {
        await setDoc(
          doc(db, "users", user.uid),
          {
            online: true,
            lastActiveAt: serverTimestamp(),
            email: user.email,
          },
          { merge: true }
        );
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

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
