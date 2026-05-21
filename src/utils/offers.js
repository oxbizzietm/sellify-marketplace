import { collection, getDocs, query, where } from "firebase/firestore";

function getTimeValue(value) {
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (value?.seconds) return value.seconds * 1000;

  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeAcceptedOffer(chat) {
  const amount = Number(chat?.lastOfferAmount);

  if (chat?.lastOfferStatus !== "accepted" || !Number.isFinite(amount)) {
    return null;
  }

  if (amount <= 0) return null;

  return {
    amount,
    chatId: chat.id || "",
    updatedAt: chat.updatedAt || chat.createdAt || null,
  };
}

export function getAcceptedOfferFromChats(chats, listingId) {
  return chats
    .filter((chat) => !listingId || chat.productId === listingId)
    .map(normalizeAcceptedOffer)
    .filter(Boolean)
    .sort((a, b) => getTimeValue(b.updatedAt) - getTimeValue(a.updatedAt))[0] || null;
}

export async function getAcceptedOfferForListing(db, listingId) {
  if (!listingId) return null;

  const chatsQuery = query(
    collection(db, "chats"),
    where("productId", "==", listingId)
  );
  const snapshot = await getDocs(chatsQuery);
  const chats = snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));

  return getAcceptedOfferFromChats(chats, listingId);
}
