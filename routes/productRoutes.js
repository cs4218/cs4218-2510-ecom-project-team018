import express from "express";
import {
  brainTreePaymentController,
  braintreeTokenController,
  createProductController,
  deleteProductController,
  getProductController,
  getSingleProductController,
  productCategoryController,
  productCategoryCountController,
  productCountController,
  productFiltersController,
  productListController,
  productPhotoController,
  relatedProductController,
  searchProductController,
  updateProductController,
  checkInventoryController,
} from "../controllers/productController.js";
import { isAdmin, requireSignIn } from "../middlewares/authMiddleware.js";
import formidable from "express-formidable";
import { xss } from "express-xss-sanitizer"

const router = express.Router();

//routes
router.post(
  "/create-product",
  requireSignIn,
  isAdmin,
  formidable(),
  xss(),
  createProductController
);
//routes
router.put(
  "/update-product/:pid",
  requireSignIn,
  isAdmin,
  formidable(),
  xss(),
  updateProductController
);

//delete product
router.delete(
  "/delete-product/:pid",
  xss(),
  requireSignIn,
  isAdmin,
  deleteProductController
);

//get products
router.get("/get-product", getProductController);

//single product
router.get("/get-product/:slug", xss(), getSingleProductController);

//get photo
router.get("/product-photo/:pid", xss(), productPhotoController);

//filter product
router.post("/product-filters", productFiltersController);

//product count
router.get("/product-count", productCountController);

//product per page
router.get("/product-list/:page", xss(), productListController);

//search product
router.get("/search/:keyword", xss(), searchProductController);

//similar product
router.get("/related-product/:pid/:cid", xss(), relatedProductController);

//category wise product
router.get("/product-category/:slug", xss(), productCategoryController);

//category wise product count
router.get("/product-category-count/:slug", xss(), productCategoryCountController);

//payments routes
//token
router.get("/braintree/token", braintreeTokenController);

//payments
router.post("/braintree/payment", requireSignIn, brainTreePaymentController);

// check sufficient inventory
router.post("/check-inventory", checkInventoryController);

export default router;
