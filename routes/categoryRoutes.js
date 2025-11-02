import express from "express";
import { isAdmin, requireSignIn } from "./../middlewares/authMiddleware.js";
import {
  categoryController,
  createCategoryController,
  deleteCategoryController,
  singleCategoryController,
  updateCategoryController,
} from "./../controllers/categoryController.js";
import { xss } from 'express-xss-sanitizer';

const router = express.Router();

//routes
// create category
router.post(
  "/create-category",
  xss(),
  requireSignIn,
  isAdmin,
  createCategoryController
);

//update category
router.put(
  "/update-category/:id",
  xss(),
  requireSignIn,
  isAdmin,
  updateCategoryController
);

//getALl category
router.get("/get-category", categoryController);

//single category
router.get("/single-category/:slug", xss(), singleCategoryController);

//delete category
router.delete(
  "/delete-category/:id",
  xss(),
  requireSignIn,
  isAdmin,
  deleteCategoryController
);

export default router;
