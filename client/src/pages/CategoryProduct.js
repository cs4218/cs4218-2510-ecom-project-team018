import React, { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/CategoryProductStyles.css";
import axios from "axios";
import { useCart } from "../context/cart";
import toast from "react-hot-toast";
import {
  formatPrice,
  getImageUrl,
  addToCart,
  handleImgError,
} from "../utils/productUtils";
import { AiOutlineReload } from "react-icons/ai";

const PAGE_SIZE = 6;

const CategoryProduct = () => {
  const params = useParams();
  const [cart, setCart] = useCart();

  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchCategoryTotal = useCallback(async (slug) => {
    try {
      const { data } = await axios.get(
        `/api/v1/product/product-category-count/${slug}`
      );
      if (!data?.success) return;
      setTotal(data.total ?? 0);
      if (data.category) {
        setCategory(data.category);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load category details");
    }
  }, []);

  const fetchProductsByCategory = useCallback(
    async (pageToLoad, slug = params?.slug, append = false) => {
      const targetSlug = slug ?? params?.slug;
      if (!targetSlug) return;

      try {
        setLoading(true);
        const { data } = await axios.get(
          `/api/v1/product/product-category/${targetSlug}?page=${pageToLoad}&limit=${PAGE_SIZE}`
        );
        setLoading(false);
        if (!data?.success) return;

        if (data.category) {
          setCategory((prev) => prev ?? data.category);
        }

        const nextProducts = Array.isArray(data?.products) ? data.products : [];
        setProducts((prev) =>
          pageToLoad === 1 || !append
            ? nextProducts
            : [...prev, ...nextProducts]
        );
      } catch (error) {
        setLoading(false);
        console.log(error);
        toast.error("Failed to load products");
      }
    },
    [params?.slug]
  );

  useEffect(() => {
    if (!params?.slug) return;
    setProducts([]);
    setCategory(null);
    setTotal(0);
    setPage(1);
    fetchCategoryTotal(params.slug);
    fetchProductsByCategory(1, params.slug);
  }, [params?.slug, fetchCategoryTotal, fetchProductsByCategory]);

  useEffect(() => {
    if (page === 1 || !params?.slug) return;
    fetchProductsByCategory(page, params.slug, true);
  }, [page, params?.slug, fetchProductsByCategory]);

  return (
    <Layout>
      <div className="container mt-3 category">
        <h4 className="text-center">Category - {category?.name ?? ""}</h4>
        <h6 className="text-center">
          {total} result{total === 1 ? "" : "s"} found{" "}
        </h6>
        <div className="row">
          <div className="col-md-9 mx-auto">
            <div className="d-flex flex-wrap justify-content-md-start justify-content-center">
              {products?.map((p) => (
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
                    <p className="card-text ">
                      {p.description.length <= 60
                        ? p.description
                        : p.description.substring(0, 60) + "..."}
                    </p>
                    <div className="card-name-price">
                      <button
                        className="btn btn-info ms-1"
                        onClick={() => navigate(`/product/${p.slug}`)}
                      >
                        More Details
                      </button>
                      <button
                        className="btn btn-dark ms-1"
                        onClick={() => addToCart(cart, setCart, p)}
                      >
                        ADD TO CART
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {!loading && products?.length === 0 && (
                <p className="text-center w-100">
                  No products found in this category.
                </p>
              )}
            </div>
            <div className="m-2 p-3">
              {products && products.length < total && (
                <button
                  className="btn btn-warning"
                  disabled={loading}
                  onClick={(e) => {
                    e.preventDefault();
                    setPage((prev) => prev + 1);
                  }}
                >
                  {loading ? "Loading ..." : "Load more"} <AiOutlineReload />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CategoryProduct;
