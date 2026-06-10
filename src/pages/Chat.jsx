import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { onValue, ref as databaseRef } from "firebase/database";
import {
  CheckCircle2,
  Clock3,
  Loader2,
  MoreVertical,
  Phone,
  RefreshCcw,
  Search,
  Send,
  XCircle,
} from "lucide-react";
import { db, rtdb } from "../firebase/firebase";
import { useAuth } from "../context/AuthContext";
import { getChatContactInfo } from "../utils/contact";

function formatListDate(timestamp) {
  if (!timestamp?.toDate) return "";
  return timestamp.toDate().toLocaleDateString([], {
    day: "numeric",
    month: "short",
  });
}

function formatMessageDay(timestamp) {
  if (!timestamp?.toDate) return "";
  return timestamp.toDate().toLocaleDateString([], {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatMessageTime(timestamp) {
  if (!timestamp?.toDate) return "sending";
  return timestamp.toDate().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTimestampDate(timestamp) {
  if (!timestamp) return null;
  if (timestamp?.toDate) return timestamp.toDate();
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp === "number") return new Date(timestamp);
  return null;
}

function formatLastSeen(timestamp) {
  const date = getTimestampDate(timestamp);

  if (!date) return "recently";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) {
    return `${diffMinutes} min${diffMinutes === 1 ? "" : "s"} ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours} hr${diffHours === 1 ? "" : "s"} ago`;
  }

  if (diffHours < 48) return "yesterday";

  return date.toLocaleDateString([], {
    day: "numeric",
    month: "short",
  });
}

function getRealtimePresence(value) {
  if (!value) {
    return {
      hasRealtimePresence: false,
      online: false,
      lastChanged: null,
    };
  }

  return {
    hasRealtimePresence: true,
    online: value.state === "online",
    lastChanged: value.lastChanged || null,
  };
}

function mergePresence(profile, presence) {
  if (!presence?.hasRealtimePresence) return profile;

  return {
    ...profile,
    online: presence.online,
    lastChanged: presence.lastChanged || profile.lastChanged,
    lastSeen: presence.lastChanged || profile.lastSeen,
  };
}

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

function formatOfferAmount(amount) {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return "Custom offer";
  }

  return `\u20a6${numericAmount.toLocaleString()}`;
}

function parseOfferAmount(value) {
  const numericAmount = Math.round(
    Number(String(value).replace(/[^\d.]/g, ""))
  );

  return Number.isFinite(numericAmount) && numericAmount > 0
    ? numericAmount
    : null;
}

function getOfferStatusMeta(status) {
  if (status === "accepted") {
    return {
      label: "Accepted",
      Icon: CheckCircle2,
      cardClass: "border-green-200 bg-green-50 text-green-950",
      iconClass: "bg-green-600 text-white",
      badgeClass: "bg-green-600 text-white",
      amountClass: "text-green-700",
      helperText:
        "Seller is interested. Final sale approval happens on dashboard",
    };
  }

  if (status === "rejected") {
    return {
      label: "Rejected",
      Icon: XCircle,
      cardClass: "border-red-200 bg-red-50 text-red-950",
      iconClass: "bg-red-600 text-white",
      badgeClass: "bg-red-600 text-white",
      amountClass: "text-red-600",
      helperText: "Offer rejected",
    };
  }

  return {
    label: "Pending",
    Icon: Clock3,
    cardClass: "border-orange-200 bg-orange-50 text-orange-950",
    iconClass: "bg-orange-500 text-white",
    badgeClass: "bg-orange-500 text-white",
    amountClass: "text-orange-600",
    helperText: "Waiting for a response",
  };
}

function Chat() {
  const { chatId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [userMap, setUserMap] = useState({});
  const [presenceMap, setPresenceMap] = useState({});
  const [presenceUserIds, setPresenceUserIds] = useState([]);
  const [productSoldMap, setProductSoldMap] = useState({});
  const [message, setMessage] = useState("");
  const [typingUsers, setTypingUsers] = useState({});
  const [activeTab, setActiveTab] = useState("all");
  const [openMenu, setOpenMenu] = useState(null);
  const [showContact, setShowContact] = useState(false);
  const [offerDraft, setOfferDraft] = useState("");
  const [counterDrafts, setCounterDrafts] = useState({});
  const [openCounterOfferId, setOpenCounterOfferId] = useState(null);
  const [offerActionLoading, setOfferActionLoading] = useState({});
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageSending, setMessageSending] = useState(false);
  const [error, setError] = useState("");

  const messagesEndRef = useRef(null);
  const activeChatIdRef = useRef("");
  const typingTimeoutRef = useRef(null);
  const offerActionLocksRef = useRef({});
  const presenceUserKey = presenceUserIds.join("|");

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    const chatsQuery = query(
      collection(db, "chats"),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(
      chatsQuery,
      async (snapshot) => {
        try {
          const allChats = snapshot.docs
            .map((item) => ({
              id: item.id,
              ...item.data(),
            }))
            .filter((chat) => chat.participants?.includes(currentUser.uid));

          const users = new Set();
          const productIds = new Set();

          allChats.forEach((chat) => {
            chat.participants?.forEach((id) => {
              if (id !== currentUser.uid) users.add(id);
            });

            if (chat.productId) productIds.add(chat.productId);
          });

          const soldMap = {};

          await Promise.all(
            [...productIds].map(async (productId) => {
              const snap = await getDoc(doc(db, "products", productId));
              soldMap[productId] = snap.exists()
                ? snap.data().sold === true
                : true;
            })
          );

          setPresenceUserIds([...users].sort());
          setProductSoldMap(soldMap);

          const syncedChats = allChats.map((chat) => ({
            ...chat,
            productSold:
              soldMap[chat.productId] === true || chat.productSold === true,
          }));

          setChats(syncedChats);

          const nextActiveChat = chatId
            ? syncedChats.find((chat) => chat.id === chatId) || null
            : null;
          const nextActiveChatId = nextActiveChat?.id || "";

          if (activeChatIdRef.current !== nextActiveChatId) {
            activeChatIdRef.current = nextActiveChatId;
            setMessages([]);
            setMessagesLoading(Boolean(nextActiveChatId));
          }

          setActiveChat(nextActiveChat);
          setError("");
          setLoading(false);
        } catch (err) {
          console.error("Chat load error:", err);
          setError("We could not load your chats. Please refresh and try again.");
          setLoading(false);
        }
      },
      (err) => {
        console.error("Chat subscription error:", err);
        setError("We could not load your chats. Please refresh and try again.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser, chatId, navigate]);

  useEffect(() => {
    if (!presenceUserKey) {
      return;
    }

    const userIds = presenceUserKey.split("|").filter(Boolean);

    const unsubscribeProfiles = userIds.map((id) =>
      onSnapshot(
        doc(db, "users", id),
        (snapshot) => {
          setUserMap((prev) => {
            const next = { ...prev };

            if (snapshot.exists()) {
              next[id] = snapshot.data();
            } else {
              delete next[id];
            }

            return next;
          });
        },
        (error) => {
          console.error("Chat profile fetch error:", error);
        }
      )
    );

    return () => {
      unsubscribeProfiles.forEach((unsubscribe) => unsubscribe());
    };
  }, [presenceUserKey]);

  useEffect(() => {
    if (!presenceUserKey) {
      return;
    }

    const userIds = presenceUserKey.split("|").filter(Boolean);

    const unsubscribePresence = userIds.map((id) =>
      onValue(databaseRef(rtdb, `status/${id}`), (snapshot) => {
        setPresenceMap((prev) => ({
          ...prev,
          [id]: getRealtimePresence(snapshot.val()),
        }));
      })
    );

    return () => {
      unsubscribePresence.forEach((unsubscribe) => unsubscribe());
    };
  }, [presenceUserKey]);

  useEffect(() => {
    if (!activeChat?.id || !currentUser) {
      return;
    }

    const messagesQuery = query(
      collection(db, "chats", activeChat.id, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribeMessages = onSnapshot(
      messagesQuery,
      async (snapshot) => {
        try {
          const allMessages = snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }));

          setMessages(allMessages);

          const unreadMessages = snapshot.docs.filter((item) => {
            const data = item.data();
            return data.senderId !== currentUser.uid && data.read !== true;
          });

          if (unreadMessages.length > 0) {
            const batch = writeBatch(db);

            unreadMessages.forEach((item) => {
              batch.update(item.ref, { read: true });
            });

            batch.update(doc(db, "chats", activeChat.id), {
              [`unreadCounts.${currentUser.uid}`]: 0,
            });

            await batch.commit();
          }

          setMessagesLoading(false);

          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
          }, 80);
        } catch (err) {
          console.error("Message load error:", err);
          setError("Messages loaded, but read status could not be updated.");
          setMessagesLoading(false);
        }
      },
      (err) => {
        console.error("Message subscription error:", err);
        setError("We could not load messages for this chat. Please try again.");
        setMessagesLoading(false);
      }
    );

    const unsubscribeTyping = onSnapshot(
      doc(db, "chats", activeChat.id),
      (snap) => {
        if (snap.exists()) {
          setTypingUsers(snap.data().typingUsers || {});
        }
      }
    );

    return () => {
      unsubscribeMessages();
      unsubscribeTyping();
    };
  }, [activeChat?.id, currentUser]);

  async function handleTyping(value) {
    setMessage(value);

    if (!activeChat || !currentUser) return;

    const chatIsSold =
      activeChat.productSold === true ||
      productSoldMap[activeChat.productId] === true;

    if (chatIsSold) return;

    await setDoc(
      doc(db, "chats", activeChat.id),
      {
        typingUsers: {
          [currentUser.uid]: value.trim().length > 0,
        },
      },
      { merge: true }
    );

    clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(async () => {
      await setDoc(
        doc(db, "chats", activeChat.id),
        {
          typingUsers: {
            [currentUser.uid]: false,
          },
        },
        { merge: true }
      );
    }, 1500);
  }

  async function stopTyping() {
    if (!activeChat || !currentUser) return;

    await setDoc(
      doc(db, "chats", activeChat.id),
      {
        typingUsers: {
          [currentUser.uid]: false,
        },
      },
      { merge: true }
    );
  }

  async function handleSend(e) {
    e.preventDefault();

    if (messageSending || !message.trim() || !activeChat || !currentUser) return;

    const chatIsSold =
      activeChat.productSold === true ||
      productSoldMap[activeChat.productId] === true;

    if (chatIsSold) return;

    const text = message.trim();

    const receiverId = activeChat.participants.find(
      (id) => id !== currentUser.uid
    );

    if (!receiverId) {
      setError("This chat is missing a receiver. Please reopen the conversation.");
      return;
    }

    const receiverUnread = activeChat.unreadCounts?.[receiverId] || 0;

    try {
      setError("");
      setMessageSending(true);

      await addDoc(collection(db, "chats", activeChat.id, "messages"), {
        text,
        senderId: currentUser.uid,
        receiverId,
        read: false,
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, "chats", activeChat.id), {
        lastMessage: text,
        lastSenderId: currentUser.uid,
        updatedAt: serverTimestamp(),
        [`unreadCounts.${receiverId}`]: receiverUnread + 1,
        [`deletedFor.${receiverId}`]: false,
        [`spamFor.${receiverId}`]: false,
      });

      try {
        await addDoc(collection(db, "users", receiverId, "alerts"), {
          type: "chat",
          title: "New message",
          message: text.length > 70 ? `${text.slice(0, 70)}...` : text,
          chatId: activeChat.id,
          productId: activeChat.productId || "",
          productTitle: activeChat.productTitle || "",
          senderId: currentUser.uid,
          read: false,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        console.error("Chat alert creation error:", err);
      }

      setMessage("");
      await stopTyping();
    } catch (err) {
      console.error("Message send error:", err);
      setError(
        "Your message could not be sent. Please check your connection and try again."
      );
    } finally {
      setMessageSending(false);
    }
  }

  async function runLockedOfferAction(key, action) {
    if (offerActionLocksRef.current[key]) return;

    offerActionLocksRef.current[key] = true;
    setOfferActionLoading((prev) => ({
      ...prev,
      [key]: true,
    }));

    try {
      await action();
    } catch (err) {
      console.error("Offer action error:", err);
    } finally {
      delete offerActionLocksRef.current[key];

      setOfferActionLoading((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  async function getOfferSenderName(fallback = "A user") {
    if (!currentUser) return fallback;

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

    return currentUser.displayName || fallback;
  }

  async function sendOfferMessage({
    amount,
    receiverId,
    kind = "offer",
    counterTo = "",
  }) {
    if (!activeChat || !currentUser || !receiverId) return;

    const chatIsSold =
      activeChat.productSold === true ||
      productSoldMap[activeChat.productId] === true;

    if (chatIsSold) return;

    const offerLabel = kind === "counter" ? "Counter offer" : "Offer";
    const formattedAmount = formatOfferAmount(amount);
    const text = `${offerLabel}: ${formattedAmount} for ${
      activeChat.productTitle || "this listing"
    }`;
    const receiverUnread = activeChat.unreadCounts?.[receiverId] || 0;
    const senderName = await getOfferSenderName(
      currentUser.uid === activeChat.sellerId ? "The seller" : "A buyer"
    );

    const offerMessageRef = await addDoc(
      collection(db, "chats", activeChat.id, "messages"),
      {
        text,
        type: "offer",
        offerKind: kind,
        offerStatus: "pending",
        status: "pending",
        dashboardApprovalStatus: "pending",
        saleStatus: "offerPending",
        offerAmount: amount,
        counterTo,
        senderId: currentUser.uid,
        receiverId,
        read: false,
        createdAt: serverTimestamp(),
      }
    );

    await updateDoc(doc(db, "chats", activeChat.id), {
      lastMessage: text,
      lastSenderId: currentUser.uid,
      lastOfferAmount: amount,
      lastOfferStatus: "pending",
      lastOfferKind: kind,
      lastOfferMessageId: offerMessageRef.id,
      dashboardOfferMessageId: offerMessageRef.id,
      lastOfferSenderId: currentUser.uid,
      lastOfferReceiverId: receiverId,
      offerStatus: "pending",
      dashboardApprovalStatus: "pending",
      saleStatus: "offerPending",
      finalSoldPrice: null,
      acceptedOfferAmount: null,
      acceptedOfferMessageId: null,
      updatedAt: serverTimestamp(),
      [`unreadCounts.${receiverId}`]: receiverUnread + 1,
      [`deletedFor.${currentUser.uid}`]: false,
      [`deletedFor.${receiverId}`]: false,
      [`spamFor.${currentUser.uid}`]: false,
      [`spamFor.${receiverId}`]: false,
    });

    await addDoc(collection(db, "users", receiverId, "alerts"), {
      type: "offer",
      title: kind === "counter" ? "Counter offer" : "New offer",
      message: `${senderName} ${
        kind === "counter" ? "sent a counter offer of" : "offered"
      } ${formattedAmount} for ${activeChat.productTitle || "your listing"}.`,
      chatId: activeChat.id,
      productId: activeChat.productId || "",
      productTitle: activeChat.productTitle || "",
      senderId: currentUser.uid,
      offerAmount: amount,
      offerStatus: "pending",
      read: false,
      createdAt: serverTimestamp(),
    });
  }

  async function handleOfferSubmit(e) {
    e.preventDefault();

    if (!activeChat || !currentUser || isSeller || chatClosed) return;

    const amount = parseOfferAmount(offerDraft);

    if (!amount) {
      window.alert("Please enter a valid offer amount.");
      return;
    }

    await runLockedOfferAction("send-offer", async () => {
      await sendOfferMessage({
        amount,
        receiverId: activeChat.sellerId,
      });

      setOfferDraft("");
    });
  }

  async function updateOfferStatus(messageItem, nextStatus) {
    if (!activeChat || !currentUser || chatClosed) return;

    const currentStatus =
      messageItem.offerStatus || messageItem.status || "pending";
    const isOfferReceiver = messageItem.receiverId
      ? messageItem.receiverId === currentUser.uid
      : messageItem.senderId !== currentUser.uid;

    if (currentStatus !== "pending" || !isOfferReceiver) {
      return;
    }

    const actionKey = `${nextStatus}-${messageItem.id}`;
    const formattedAmount = formatOfferAmount(messageItem.offerAmount);

    await runLockedOfferAction(actionKey, async () => {
      const messageRef = doc(
        db,
        "chats",
        activeChat.id,
        "messages",
        messageItem.id
      );
      const chatRef = doc(db, "chats", activeChat.id);
      const batch = writeBatch(db);
      const resultText =
        nextStatus === "accepted"
          ? `Offer accepted: ${formattedAmount}`
          : `Offer rejected: ${formattedAmount}`;

      batch.update(messageRef, {
        offerStatus: nextStatus,
        status: nextStatus,
        dashboardApprovalStatus:
          nextStatus === "accepted" ? "pending" : "rejected",
        saleStatus:
          nextStatus === "accepted"
            ? "awaitingDashboardApproval"
            : "rejected",
        actedAt: serverTimestamp(),
        actedBy: currentUser.uid,
      });

      batch.update(chatRef, {
        lastMessage: resultText,
        lastSenderId: currentUser.uid,
        lastOfferAmount: messageItem.offerAmount || 0,
        lastOfferStatus: nextStatus,
        lastOfferMessageId: messageItem.id,
        dashboardOfferMessageId: messageItem.id,
        lastOfferSenderId: messageItem.senderId,
        lastOfferReceiverId: messageItem.receiverId || currentUser.uid,
        offerStatus: nextStatus,
        ...(nextStatus === "accepted"
          ? {
              acceptedOfferAmount: messageItem.offerAmount || 0,
              acceptedOfferMessageId: messageItem.id,
              acceptedOfferAt: serverTimestamp(),
              dashboardApprovalStatus: "pending",
              saleStatus: "awaitingDashboardApproval",
            }
          : {
              dashboardApprovalStatus: "rejected",
              saleStatus: "rejected",
            }),
        updatedAt: serverTimestamp(),
        [`deletedFor.${messageItem.senderId}`]: false,
        [`spamFor.${messageItem.senderId}`]: false,
      });

      await batch.commit();

      await addDoc(
        collection(db, "users", messageItem.senderId, "alerts"),
        {
          type: "offer",
          title:
            nextStatus === "accepted" ? "Offer accepted" : "Offer rejected",
          message: `Your offer of ${formattedAmount} for ${
            activeChat.productTitle || "this listing"
          } was ${nextStatus}.`,
          chatId: activeChat.id,
          productId: activeChat.productId || "",
          productTitle: activeChat.productTitle || "",
          senderId: currentUser.uid,
          offerAmount: messageItem.offerAmount || 0,
          offerStatus: nextStatus,
          read: false,
          createdAt: serverTimestamp(),
        }
      );
    });
  }

  function toggleCounterOffer(messageId) {
    setOpenCounterOfferId((current) =>
      current === messageId ? null : messageId
    );
  }

  async function handleCounterOffer(e, messageItem) {
    e.preventDefault();

    if (!activeChat || !currentUser || chatClosed) return;

    const isOfferReceiver = messageItem.receiverId
      ? messageItem.receiverId === currentUser.uid
      : messageItem.senderId !== currentUser.uid;

    if (!isOfferReceiver) return;

    const amount = parseOfferAmount(counterDrafts[messageItem.id]);

    if (!amount) {
      window.alert("Please enter a valid counter offer amount.");
      return;
    }

    await runLockedOfferAction(`counter-${messageItem.id}`, async () => {
      await sendOfferMessage({
        amount,
        receiverId: messageItem.senderId,
        kind: "counter",
        counterTo: messageItem.id,
      });

      setOpenCounterOfferId(null);
      setCounterDrafts((prev) => {
        const next = { ...prev };
        delete next[messageItem.id];
        return next;
      });
    });
  }

  async function moveToSpam(id) {
    await updateDoc(doc(db, "chats", id), {
      [`spamFor.${currentUser.uid}`]: true,
    });

    setOpenMenu(null);

    if (activeChat?.id === id) {
      setActiveChat(null);
      navigate("/chat");
    }
  }

  async function restoreChat(id) {
    await updateDoc(doc(db, "chats", id), {
      [`spamFor.${currentUser.uid}`]: false,
    });

    setOpenMenu(null);
  }

  async function deleteChat(id) {
    const confirmDelete = window.confirm("Delete this chat from your inbox?");
    if (!confirmDelete) return;

    await updateDoc(doc(db, "chats", id), {
      [`deletedFor.${currentUser.uid}`]: true,
      [`unreadCounts.${currentUser.uid}`]: 0,
    });

    setOpenMenu(null);

    if (activeChat?.id === id) {
      setActiveChat(null);
      navigate("/chat");
    }
  }

  const filteredChats = chats.filter((chat) => {
    const hasStarted = Boolean(chat.lastMessage);
    const isSpam = chat.spamFor?.[currentUser?.uid] === true;
    const isDeleted = chat.deletedFor?.[currentUser?.uid] === true;
    const unread = chat.unreadCounts?.[currentUser?.uid] || 0;

    if (!hasStarted) return false;
    if (isDeleted) return false;
    if (activeTab === "spam") return isSpam;
    if (activeTab === "unread") return !isSpam && unread > 0;

    return !isSpam;
  });

  const unreadThreads = chats.filter(
    (chat) =>
      Boolean(chat.lastMessage) &&
      chat.deletedFor?.[currentUser?.uid] !== true &&
      chat.spamFor?.[currentUser?.uid] !== true &&
      (chat.unreadCounts?.[currentUser?.uid] || 0) > 0
  ).length;

  const otherUserId = activeChat?.participants?.find(
    (id) => id !== currentUser?.uid
  );

  const otherUser = mergePresence(
    userMap[otherUserId] || {},
    presenceMap[otherUserId]
  );
  const isSeller = activeChat && currentUser?.uid === activeChat.sellerId;

  const chatClosed =
    activeChat?.productSold === true ||
    productSoldMap[activeChat?.productId] === true;

  const contactInfo = getChatContactInfo(activeChat, otherUser);
  const chatListOrderClass = activeChat ? "order-2" : "order-1";
  const messagePaneOrderClass = activeChat ? "order-1" : "order-2";

  function renderMessageMeta(messageItem, isMe) {
    return (
      <div className="mt-2 flex justify-end gap-2 text-xs text-slate-400">
        <span>{formatMessageTime(messageItem.createdAt)}</span>

        {isMe && (
          <span
            className={
              messageItem.read
                ? "font-black text-green-600"
                : "font-black text-slate-400"
            }
          >
            {messageItem.read ? "✓✓" : "✓"}
          </span>
        )}
      </div>
    );
  }

  function renderOfferMessage(messageItem, isMe) {
    const status = messageItem.offerStatus || messageItem.status || "pending";
    const meta = getOfferStatusMeta(status);
    const StatusIcon = meta.Icon;
    const isCounterOffer = messageItem.offerKind === "counter";
    const senderIsSeller = messageItem.senderId === activeChat?.sellerId;
    const offerTitle = isCounterOffer
      ? `${senderIsSeller ? "Seller" : "Buyer"} countered`
      : `${senderIsSeller ? "Seller" : "Buyer"} offer`;
    const actionBusy =
      offerActionLoading[`accepted-${messageItem.id}`] ||
      offerActionLoading[`rejected-${messageItem.id}`] ||
      offerActionLoading[`counter-${messageItem.id}`];
    const isOfferReceiver = messageItem.receiverId
      ? messageItem.receiverId === currentUser.uid
      : !isMe;
    const canRespondToOffer =
      isOfferReceiver &&
      status === "pending" &&
      !chatClosed;
    const counterIsOpen = openCounterOfferId === messageItem.id;
    const counterLoading = offerActionLoading[`counter-${messageItem.id}`];

    return (
      <div
        className={`max-w-full break-words rounded-2xl border p-3 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md sm:max-w-[400px] sm:p-4 ${
          isMe ? "rounded-br-md" : "rounded-bl-md"
        } ${meta.cardClass}`}
      >
        <div className="flex items-start gap-2.5">
          <div
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl shadow-sm ${meta.iconClass}`}
          >
            <StatusIcon size={18} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-black uppercase tracking-wide opacity-70">
                  {isCounterOffer ? "Counter offer" : "Offer"}
                </p>

                <h3 className="mt-0.5 text-base font-black">
                  {offerTitle}
                </h3>
              </div>

              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${meta.badgeClass}`}
              >
                <StatusIcon size={12} />
                {meta.label}
              </span>
            </div>

            <div className="mt-3 rounded-xl bg-white/75 p-3 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-wide opacity-60">
                Offer amount
              </p>

              <p className={`mt-0.5 text-xl font-black sm:text-2xl ${meta.amountClass}`}>
                {formatOfferAmount(messageItem.offerAmount)}
              </p>

              <p className="mt-1 text-xs font-semibold opacity-70">
                {meta.helperText} for {activeChat.productTitle || "this item"}.
              </p>
            </div>

            {canRespondToOffer && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => updateOfferStatus(messageItem, "accepted")}
                  disabled={Boolean(actionBusy)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-black text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {offerActionLoading[`accepted-${messageItem.id}`] ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={14} />
                  )}
                  Accept
                </button>

                <button
                  type="button"
                  onClick={() => updateOfferStatus(messageItem, "rejected")}
                  disabled={Boolean(actionBusy)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {offerActionLoading[`rejected-${messageItem.id}`] ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <XCircle size={14} />
                  )}
                  Reject
                </button>

                <button
                  type="button"
                  onClick={() => toggleCounterOffer(messageItem.id)}
                  disabled={Boolean(actionBusy)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-orange-300 bg-white px-3 py-1.5 text-xs font-black text-orange-700 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCcw size={14} />
                  Counter offer
                </button>
              </div>
            )}

            {canRespondToOffer && counterIsOpen && (
              <form
                onSubmit={(e) => handleCounterOffer(e, messageItem)}
                className="mt-2 flex flex-col gap-2 rounded-xl border border-orange-200 bg-white/80 p-2 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
                  <NairaIcon
                    size={16}
                    className="rounded-full border-2 border-orange-500 text-orange-500"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Counter amount"
                    value={counterDrafts[messageItem.id] || ""}
                    onChange={(e) =>
                      setCounterDrafts((prev) => ({
                        ...prev,
                        [messageItem.id]: e.target.value,
                      }))
                    }
                    className="min-w-0 flex-1 bg-transparent text-xs font-bold text-slate-900 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={
                    counterLoading || !counterDrafts[messageItem.id]?.trim()
                  }
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-black text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {counterLoading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                  Send
                </button>
              </form>
            )}

            {renderMessageMeta(messageItem, isMe)}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="h-14 w-14 animate-spin rounded-full border-4 border-green-200 border-t-green-600" />
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#eaf2f6] px-2 py-3 sm:px-4 lg:h-[calc(100vh-96px)] lg:min-h-0 lg:overflow-hidden lg:py-5">
      <style>
        {`
          .sellify-scroll::-webkit-scrollbar {
            width: 10px;
          }

          .sellify-scroll::-webkit-scrollbar-track {
            background: #e5edf1;
            border-radius: 999px;
          }

          .sellify-scroll::-webkit-scrollbar-thumb {
            background: #9aa8b2;
            border-radius: 999px;
          }

          .sellify-scroll::-webkit-scrollbar-thumb:hover {
            background: #74828c;
          }
        `}
      </style>

      {error && (
        <div className="mx-auto mb-3 max-w-7xl rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-600">
          {error}
        </div>
      )}

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 overflow-hidden rounded-2xl bg-white shadow-xl lg:grid lg:h-full lg:grid-cols-[390px_1fr] lg:gap-0 lg:rounded-[1.7rem]">
        <aside
          className={`${chatListOrderClass} flex max-h-[70vh] min-h-[360px] min-w-0 flex-col border-b border-slate-200 bg-white lg:order-none lg:h-full lg:max-h-none lg:min-h-0 lg:border-b-0 lg:border-r`}
        >
          <div className="shrink-0 border-b border-slate-200 p-4 sm:p-5">
            <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">My messages</h1>

            <div className="relative mt-4">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                placeholder="Search"
                className="w-full rounded-2xl border border-slate-300 py-3 pl-11 pr-4 outline-none focus:border-green-500"
              />
            </div>
          </div>

          <div className="flex shrink-0 border-b border-slate-200">
            {["all", "unread", "spam"].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setActiveChat(null);
                  navigate("/chat");
                }}
                className={`flex-1 py-4 text-sm font-black capitalize ${
                  activeTab === tab
                    ? "border-b-2 border-green-600 text-green-600"
                    : "text-slate-400"
                }`}
              >
                {tab}
                {tab === "unread" && ` (${unreadThreads})`}
              </button>
            ))}
          </div>

          <div className="sellify-scroll h-full min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
            {filteredChats.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm font-semibold text-slate-400">
                No {activeTab === "all" ? "messages" : activeTab} chats.
              </div>
            ) : (
              filteredChats.map((chat) => {
                const otherId = chat.participants?.find(
                  (id) => id !== currentUser.uid
                );

                const person = mergePresence(
                  userMap[otherId] || {},
                  presenceMap[otherId]
                );
                const unread = chat.unreadCounts?.[currentUser.uid] || 0;
                const active = chat.id === activeChat?.id;

                const isSold =
                  chat.productSold === true ||
                  productSoldMap[chat.productId] === true;

                return (
                  <div
                    key={chat.id}
                    className={`group relative flex min-w-0 gap-3 border-b border-slate-100 p-3 transition sm:p-4 ${
                      active ? "bg-green-50" : "bg-white hover:bg-slate-50"
                    }`}
                  >
                    <Link
                      to={`/chat/${chat.id}`}
                      className="flex min-w-0 flex-1 gap-3"
                    >
                      <div className="relative shrink-0">
                        <img
                          src={
                            chat.productImage ||
                            "https://placehold.co/100x100"
                          }
                          alt=""
                          className={`h-16 w-16 rounded-xl object-cover ${
                            isSold ? "grayscale" : ""
                          }`}
                        />

                        {isSold && (
                          <span className="absolute left-1 top-1 rounded bg-red-500 px-1.5 py-0.5 text-[9px] font-black text-white">
                            SOLD
                          </span>
                        )}

                        <img
                          src={
                            person.photoUrl ||
                            `https://api.dicebear.com/7.x/initials/svg?seed=${
                              person.name || person.username || "User"
                            }`
                          }
                          alt=""
                          className="absolute -bottom-2 -right-2 h-10 w-10 rounded-full border-4 border-white object-cover"
                        />

                        {person.online && (
                          <span className="absolute -bottom-1 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-green-500" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1 pr-9 sm:pr-12">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-base font-semibold text-slate-900">
                              {person.name ||
                                (currentUser.uid === chat.sellerId
                                  ? "Buyer"
                                  : "Seller")}
                            </p>

                            {typingUsers?.[otherId] ? (
                              <p className="animate-pulse text-xs font-bold text-green-600">
                                typing...
                              </p>
                            ) : person.online ? (
                              <p className="text-xs font-bold text-green-600">
                                Online
                              </p>
                            ) : null}
                          </div>

                          <p className="shrink-0 text-xs font-semibold text-slate-600 sm:text-sm">
                            {formatListDate(chat.updatedAt)}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {isSold && (
                            <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-black uppercase text-slate-500">
                              CLOSED
                            </span>
                          )}

                          <h2 className="truncate text-base font-black text-slate-950">
                            {chat.productTitle}
                          </h2>
                        </div>

                        <p className="truncate text-base text-slate-500">
                          {isSold
                            ? "This advert has been sold"
                            : chat.lastMessage || "No messages yet"}
                        </p>
                      </div>

                      {unread > 0 && (
                        <span className="absolute bottom-4 right-6 grid h-6 min-w-6 place-items-center rounded-full bg-green-600 px-2 text-xs font-black text-white sm:right-8">
                          {unread > 9 ? "9+" : unread}
                        </span>
                      )}
                    </Link>

                    <div className="absolute right-1 top-2">
                      <button
                        onClick={() =>
                          setOpenMenu(openMenu === chat.id ? null : chat.id)
                        }
                        className="grid h-8 w-8 place-items-center rounded-full hover:bg-slate-100"
                      >
                        <MoreVertical size={18} />
                      </button>

                      {openMenu === chat.id && (
                        <div className="absolute right-0 top-9 z-30 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                          {chat.spamFor?.[currentUser.uid] ? (
                            <button
                              onClick={() => restoreChat(chat.id)}
                              className="w-full px-4 py-3 text-left text-sm font-bold text-green-600 hover:bg-green-50"
                            >
                              Restore chat
                            </button>
                          ) : (
                            <button
                              onClick={() => moveToSpam(chat.id)}
                              className="w-full px-4 py-3 text-left text-sm font-bold text-orange-500 hover:bg-orange-50"
                            >
                              Move to spam
                            </button>
                          )}

                          <button
                            onClick={() => deleteChat(chat.id)}
                            className="w-full border-t border-slate-100 px-4 py-3 text-left text-sm font-bold text-red-500 hover:bg-red-50"
                          >
                            Delete chat
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        <section
          className={`${messagePaneOrderClass} flex min-w-0 flex-col bg-[#eaf2f6] ${
            activeChat ? "min-h-[680px]" : "min-h-[280px]"
          } lg:order-none lg:h-full lg:min-h-0`}
        >
          {!activeChat ? (
            <div className="flex min-h-[280px] items-center justify-center px-4 text-center lg:h-full lg:min-h-0">
              <p className="text-lg font-semibold text-slate-600">
                Select a chat to start messaging
              </p>
            </div>
          ) : (
            <>
              <div className="shrink-0 bg-white">
                <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                    <div className="relative">
                      <img
                        src={
                          otherUser.photoUrl ||
                          `https://api.dicebear.com/7.x/initials/svg?seed=${
                            otherUser.name || otherUser.username || "User"
                          }`
                        }
                        alt=""
                        className="h-11 w-11 rounded-full object-cover sm:h-12 sm:w-12"
                      />

                      {otherUser.online && (
                        <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white bg-green-500" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-black text-slate-900 sm:text-xl">
                        {otherUser.name || (isSeller ? "Buyer" : "Seller")}
                      </h2>

                      {typingUsers?.[otherUserId] ? (
                        <p className="mt-0.5 animate-pulse text-sm font-bold text-green-600">
                          typing...
                        </p>
                      ) : otherUser.online ? (
                        <p className="mt-0.5 text-sm font-semibold text-green-600">
                          Online
                        </p>
                      ) : (
                        <p className="mt-0.5 text-sm font-semibold text-slate-400">
                          Last seen{" "}
                          {formatLastSeen(
                            otherUser.lastChanged || otherUser.lastSeen
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex min-w-0 items-center gap-3">
                    {!isSeller && (
                      <button
                        onClick={() => setShowContact(!showContact)}
                        className="flex w-full min-w-0 items-center justify-center gap-2 rounded-xl border-2 border-green-600 px-4 py-2.5 font-black text-green-600 hover:bg-green-50 sm:w-auto sm:px-5 sm:py-3"
                      >
                        <Phone size={18} />
                        <span className="min-w-0 break-all">
                          {showContact ? contactInfo : "Show contact"}
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                <Link
                  to={`/product/${activeChat.productId}`}
                  className="flex min-w-0 items-center gap-3 border-b border-slate-100 px-4 py-3 hover:bg-slate-50 sm:gap-4 sm:px-6"
                >
                  <div className="relative">
                    <img
                      src={
                        activeChat.productImage ||
                        "https://placehold.co/100x100"
                      }
                      alt=""
                      className={`h-14 w-14 rounded-xl object-cover ${
                        chatClosed ? "grayscale" : ""
                      }`}
                    />

                    {chatClosed && (
                      <span className="absolute left-1 top-1 rounded bg-red-500 px-1.5 py-0.5 text-[9px] font-black text-white">
                        SOLD
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      {chatClosed && (
                        <span className="rounded bg-slate-200 px-2 py-1 text-xs font-black uppercase text-slate-500">
                          CLOSED
                        </span>
                      )}

                      <p className="min-w-0 truncate font-black text-slate-900">
                        {activeChat.productTitle}
                      </p>
                    </div>

                    <p
                      className={`font-black ${
                        chatClosed ? "text-red-500" : "text-green-600"
                      }`}
                    >
                      {chatClosed
                        ? "SOLD"
                        : `₦${activeChat.productPrice?.toLocaleString()}`}
                    </p>
                  </div>
                </Link>
              </div>

              <div className="sellify-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6">
                <div className="mb-8 flex justify-center">
                  <div className="max-w-full rounded-full border border-orange-300 bg-orange-50 px-4 py-3 text-center text-sm font-semibold text-orange-700 sm:px-6">
                    ⚠️ Avoid paying in advance! Even for delivery
                  </div>
                </div>

                {chatClosed && (
                  <div className="mb-8 flex justify-center">
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-center">
                      <p className="font-black text-red-600">
                        This advert has been sold
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        You can still view this conversation, but new messages
                        are closed.
                      </p>
                    </div>
                  </div>
                )}

                {messagesLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-500 shadow-sm">
                      <Loader2
                        size={18}
                        className="animate-spin text-green-600"
                      />
                      Loading messages...
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {messages.map((msg, index) => {
                      const isMe = msg.senderId === currentUser.uid;
                      const currentDay = formatMessageDay(msg.createdAt);
                      const previousDay =
                        index > 0
                          ? formatMessageDay(messages[index - 1].createdAt)
                          : null;

                      const showDate = currentDay && currentDay !== previousDay;

                      return (
                        <div key={msg.id}>
                          {showDate && (
                            <div className="my-6 flex justify-center">
                              <span className="rounded-full bg-[#dce8ee] px-4 py-1 text-sm font-semibold text-slate-500">
                                {currentDay}
                              </span>
                            </div>
                          )}

                          <div
                            className={`flex ${
                              isMe ? "justify-end" : "justify-start"
                            }`}
                          >
                            {msg.type === "offer" ? (
                              renderOfferMessage(msg, isMe)
                            ) : (
                              <div
                                className={`max-w-[85%] break-words rounded-2xl px-4 py-3 text-sm shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md sm:max-w-[360px] ${
                                  isMe
                                    ? "rounded-br-md bg-green-200 text-slate-900"
                                    : "rounded-bl-md bg-white text-slate-900"
                                }`}
                              >
                                <p className="whitespace-pre-wrap">{msg.text}</p>
                                {renderMessageMeta(msg, isMe)}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              <div className="shrink-0 border-t border-slate-200 bg-white px-3 py-3 sm:px-5">
                {chatClosed ? (
                  <div className="rounded-2xl bg-slate-100 py-4 text-center font-black text-slate-500">
                    Chat closed because this advert has been sold.
                  </div>
                ) : (
                  <>
                    {!isSeller && (
                      <form
                        onSubmit={handleOfferSubmit}
                        className="mb-2 flex flex-col gap-2 rounded-xl border border-orange-200 bg-orange-50 p-2 transition-all duration-300 sm:flex-row sm:items-center"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-orange-200 bg-white px-3 py-2 shadow-sm">
                          <NairaIcon
                            size={16}
                            className="rounded-full border-2 border-orange-500 text-orange-500"
                          />

                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="Enter offer amount"
                            value={offerDraft}
                            onChange={(e) => setOfferDraft(e.target.value)}
                            className="min-w-0 flex-1 bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={
                            offerActionLoading["send-offer"] ||
                            !offerDraft.trim()
                          }
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-orange-500 px-3 py-2 text-sm font-black text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {offerActionLoading["send-offer"] ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <NairaIcon
                              size={15}
                              className="rounded-full border-2 border-white text-white"
                            />
                          )}
                          Send offer
                        </button>
                      </form>
                    )}

                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {(isSeller
                        ? [
                            "Yes it's available",
                            "What's your budget?",
                            "Can you meet today?",
                            "Please call me",
                          ]
                        : [
                            "Last price",
                            "Is this available",
                            "Ask for location",
                            "Please call me",
                            "Thanks",
                          ]
                      ).map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => handleTyping(item)}
                          disabled={messageSending}
                          className="rounded-lg border border-green-600 px-3 py-1.5 text-xs font-black text-green-600 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {item}
                        </button>
                      ))}
                    </div>

                    <form
                      onSubmit={handleSend}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="text"
                        placeholder="Type a message"
                        className="min-w-0 flex-1 rounded-full border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-500 sm:px-5"
                        value={message}
                        onChange={(e) => handleTyping(e.target.value)}
                        onBlur={stopTyping}
                        disabled={messageSending}
                      />

                      <button
                        type="submit"
                        disabled={messageSending || !message.trim()}
                        className="grid h-11 w-11 place-items-center rounded-full bg-green-600 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {messageSending ? (
                          <Loader2 size={19} className="animate-spin" />
                        ) : (
                          <Send size={19} />
                        )}
                      </button>
                    </form>
                  </>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

export default Chat;
