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
  const { slug } = useParams();
  const [cart, setCart] = useCart();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // fetch total product count for given category
  const fetchCategoryTotal = useCallback(async (categorySlug) => {
    try {
      const { data } = await axios.get(
        `/api/v1/product/product-category-count/${categorySlug}`
      );
      if (data?.success) {
        setTotal(data.total ?? 0);
      } else {
        throw new Error("Failed to load total products");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load total products");
    }
  }, []);

  // fetch products by category and page
  const fetchProductsByCategory = useCallback(
    async (pageToLoad) => {
      try {
        setLoading(true);
        const { data } = await axios.get(
          `/api/v1/product/product-category/${slug}?page=${pageToLoad}&limit=${PAGE_SIZE}`
        );

        if (!data?.success) {
          throw new Error("Failed to load products");
        }

        if (data.category) setCategory(data.category);

        const nextProducts = Array.isArray(data?.products) ? data.products : [];
        setProducts((prev) =>
          pageToLoad === 1 ? nextProducts : [...prev, ...nextProducts]
        );
      } catch (error) {
        console.error(error);
        toast.error("Failed to load products");
      } finally {
        setLoading(false);
      }
    },
    [slug]
  );

  // on slug change, reset state and fetch first page
  useEffect(() => {
    if (!slug) return;
    setProducts([]);
    setCategory(null);
    setTotal(0);
    setPage(1);

    fetchCategoryTotal(slug);
    fetchProductsByCategory(1, slug);
  }, [slug, fetchCategoryTotal, fetchProductsByCategory]);

  // on page change (except first page), fetch next page
  useEffect(() => {
    if (page === 1) return;
    fetchProductsByCategory(page);
  }, [page, fetchProductsByCategory]);

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
                    <p className="card-text">
                      {p.description
                        ? p.description.length <= 60
                          ? p.description
                          : p.description.substring(0, 60) + "..."
                        : "No description available"}
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
                  {loading ? (
                    "Loading ..."
                  ) : (
                    <>
                      Load more <AiOutlineReload />
                    </>
                  )}
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
