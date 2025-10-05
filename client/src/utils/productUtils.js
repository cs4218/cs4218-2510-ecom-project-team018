import toast from "react-hot-toast";

export const formatPrice = (price) => {
  return (
    price?.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    }) ?? "$0.00"
  );
};

export const getImageUrl = (id) =>
  id ? `/api/v1/product/product-photo/${id}` : "/images/placeholder.png";

export const addToCart = (cart, setCart, p) => {
  const alreadyInCart = cart.findIndex((item) => item._id === p._id) !== -1;
  if (alreadyInCart) {
    toast.error("Item already in cart");
    return false;
  }
  const updatedCart = [...cart, p];
  setCart(updatedCart);
  localStorage.setItem("cart", JSON.stringify(updatedCart));
  toast.success("Item added to cart");
  return true;
};

export const handleImgError = (e) => {
  e.target.src = "/images/placeholder.png";
};

const truncateWithEllipsis = (description = "", limit) => {
  if (typeof description !== "string") return "";
  if (description.length <= limit) {
    return description;
  }
  return `${description.substring(0, limit)}...`;
};

export const truncateDescription30 = (description) =>
  truncateWithEllipsis(description, 30);

export const truncateDescription60 = (description) =>
  truncateWithEllipsis(description, 60);
