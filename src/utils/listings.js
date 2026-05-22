export function getListingStatus(product) {
  if (product?.sold === true) return "sold";
  return product?.listingStatus || "active";
}

export function getListingStock(product) {
  const stock = Number(product?.stock ?? product?.quantity ?? 1);

  if (!Number.isFinite(stock)) return 1;

  return Math.max(0, Math.round(stock));
}

export function getUnitsSold(product) {
  const unitsSold = Number(product?.unitsSold ?? product?.soldQuantity);

  if (Number.isFinite(unitsSold)) {
    return Math.max(0, Math.round(unitsSold));
  }

  return product?.sold === true ? 1 : 0;
}

export function getFinalSaleUnitPrice(product) {
  const finalPrice = Number(
    product?.finalSoldPrice ??
      product?.finalSaleUnitPrice ??
      product?.soldPrice ??
      product?.acceptedOfferAmount
  );

  if (Number.isFinite(finalPrice) && finalPrice > 0) {
    return finalPrice;
  }

  const lastSaleTotal = Number(product?.lastSaleTotal);
  const lastSoldQuantity = Number(product?.lastSoldQuantity);

  if (
    Number.isFinite(lastSaleTotal) &&
    Number.isFinite(lastSoldQuantity) &&
    lastSoldQuantity > 0
  ) {
    return lastSaleTotal / lastSoldQuantity;
  }

  return Number(product?.price) || 0;
}

export function getSalesTotal(product) {
  const unitsSold = getUnitsSold(product);
  const salesTotal = Number(product?.salesTotal ?? product?.saleTotal);

  if (Number.isFinite(salesTotal)) {
    return Math.max(0, salesTotal);
  }

  return unitsSold * getFinalSaleUnitPrice(product);
}

export function isPublicListing(product) {
  return (
    product?.sold !== true &&
    getListingStatus(product) === "active" &&
    getListingStock(product) > 0
  );
}

export function formatListingPrice(price) {
  if (price === undefined || price === null || price === "") {
    return "Price on request";
  }

  const parsedPrice = Number(price);

  if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
    return "Price on request";
  }

  return `\u20a6${parsedPrice.toLocaleString()}`;
}

export function getListingImage(product) {
  return (
    product?.imageUrl ||
    product?.images?.[0] ||
    "https://placehold.co/800x600?text=Sellify"
  );
}
