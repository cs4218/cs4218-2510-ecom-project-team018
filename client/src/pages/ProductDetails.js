import React, { useState, useEffect, useCallback } from "react";
import Layout from "./../components/Layout";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/ProductDetailsStyles.css";
import { useCart } from "../context/cart";
import toast from "react-hot-toast";

const ProductDetails = () => {
  const params = useParams();
  const navigate = useNavigate();
  const [cart, setCart] = useCart();

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch single product
  const getProduct = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await axios.get(
        `/api/v1/product/get-product/${params.slug}`
      );

      setProduct(data?.product || null);

      if (data?.product?._id && data?.product?.category?._id) {
        await getSimilarProducts(data.product._id, data.product.category._id);
      } else {
        setRelatedProducts([]);
      }
    } catch (err) {
      console.error("Error fetching product:", err);

      if (err.response?.status === 404) {
        setProduct(null);
      } else {
        setError("Failed to load product details. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  }, [params?.slug]);

  // Fetch similar products
  const getSimilarProducts = async (pid, cid) => {
    try {
      const { data } = await axios.get(
        `/api/v1/product/related-product/${pid}/${cid}`
      );
      setRelatedProducts(data?.products || []);
    } catch (err) {
      console.error("Error fetching related products:", err);
      setRelatedProducts([]);
    }
  };

  useEffect(() => {
    getProduct();
  }, [getProduct]);

  // Helper functions
  const formatPrice = (price) => {
    return price.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });
  };

  const getImageUrl = (id) =>
    id ? `/api/v1/product/product-photo/${id}` : "/images/placeholder.png";

  const addToCart = (p) => {
    const alreadyInCart = cart.findIndex((item) => item._id === p._id) !== -1;
    if (alreadyInCart) {
      toast.error("Item already in cart");
      return;
    }
    setCart([...cart, p]);
    localStorage.setItem("cart", JSON.stringify([...cart, p]));
    toast.success("Item added to cart");
  };

  const handleImgError = (e) => {
    e.target.src = "/images/placeholder.png";
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center p-5">Loading product details...</div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="text-center text-danger p-5">{error}</div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="text-center p-5">No Such Product Found.</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="row container product-details">
        <div className="col-md-6">
          <img
            src={getImageUrl(product._id)}
            className="card-img-top"
            alt={product?.name || "Product"}
            height="300"
            width="350"
            onError={handleImgError}
          />
        </div>
        <div className="col-md-6 product-details-info">
          <h1 className="text-center">Product Details</h1>
          <hr />
          <h6>Name : {product.name || "No Name Available"}</h6>
          <h6>
            Description : {product.description || "No Description Available"}
          </h6>
          <h6>
            Price : {product.price ? formatPrice(product.price) : "$0.00"}
          </h6>
          <h6>Category : {product.category?.name || "Uncategorized"}</h6>
          <button
            className="btn btn-secondary ms-1"
            onClick={() => addToCart(product)}
            data-testid="main-add-to-cart"
          >
            ADD TO CART
          </button>
        </div>
      </div>
      <hr />
      <div
        className="row container similar-products"
        data-testid="similar-products"
      >
        <h4>Similar Products ➡️</h4>
        {!relatedProducts?.length >= 1 && (
          <p className="text-center">No similar products found</p>
        )}
        <div className="d-flex flex-wrap">
          {relatedProducts?.map((p) => (
            <div className="card m-2" key={p._id}>
              <img
                src={getImageUrl(p._id)}
                className="card-img-top"
                alt={p.name}
                onError={handleImgError}
              />
              <div className="card-body">
                <div className="card-name-price">
                  <h5 className="card-title">{p.name}</h5>
                  <h5 className="card-title card-price">
                    {formatPrice(p.price)}
                  </h5>
                </div>
                <p className="card-text">{p.description.substring(0, 60)}...</p>
                <div className="card-name-price">
                  <button
                    className="btn btn-info ms-1"
                    onClick={() => navigate(`/product/${p.slug}`)}
                  >
                    More Details
                  </button>
                  <button
                    className="btn btn-dark ms-1"
                    onClick={() => addToCart(p)}
                  >
                    ADD TO CART
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default ProductDetails;
