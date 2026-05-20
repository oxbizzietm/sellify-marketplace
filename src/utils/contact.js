function firstFilledText(...values) {
  return (
    values
      .map((value) => String(value ?? "").trim())
      .find((value) => value.length > 0) || ""
  );
}

export function getProductContactInfo(product, seller, fallback = "No number") {
  return (
    firstFilledText(
      product?.productPhone,
      product?.phone,
      product?.sellerPhone,
      seller?.phone,
      seller?.phoneNumber,
      seller?.contactPhone
    ) || fallback
  );
}

export function getChatContactInfo(chat, otherUser, fallback = "No contact saved") {
  return (
    firstFilledText(
      chat?.productPhone,
      chat?.phone,
      chat?.sellerPhone,
      otherUser?.phone,
      otherUser?.phoneNumber,
      otherUser?.contactPhone
    ) || fallback
  );
}
