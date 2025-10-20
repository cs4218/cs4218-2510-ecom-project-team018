import productModel from "../models/productModel.js";
import categoryModel from "../models/categoryModel.js";
import orderModel from "../models/orderModel.js";

import fs from "fs";
import slugify from "slugify";
import braintree from "braintree";
import dotenv from "dotenv";
import mongoose from "mongoose";

export const DEFAULT_PAGE_SIZE = 6;
export const DEFAULT_PAGE_NUMBER = 1;

dotenv.config();

// payment gateway
var gateway = new braintree.BraintreeGateway({
  environment: braintree.Environment.Sandbox,
  merchantId: process.env.BRAINTREE_MERCHANT_ID,
  publicKey: process.env.BRAINTREE_PUBLIC_KEY,
  privateKey: process.env.BRAINTREE_PRIVATE_KEY,
});

export const createProductController = async (req, res) => {
  try {
    let { name, description, price, category, quantity, shipping } = req.fields;
    const { photo } = req.files;

    // validation
    switch (true) {
      case !name:
        return res
          .status(400)
          .send({ success: false, message: "Name is required" });
      case !description:
        return res
          .status(400)
          .send({ success: false, message: "Description is required" });
      case !price:
        return res
          .status(400)
          .send({ success: false, message: "Price is required" });
      case !category:
        return res
          .status(400)
          .send({ success: false, message: "Category is required" });
      case !quantity:
        return res
          .status(400)
          .send({ success: false, message: "Quantity is required" });
      case shipping === undefined || shipping === "":
        return res
          .status(400)
          .send({ success: false, message: "Shipping is required" });
      case photo && photo.size > 1000000:
        return res.status(413).send({
          success: false,
          message: "Photo is required and should be less than 1MB",
        });
    }

    // normalize shipping value ("1" => true, "0" => false)
    shipping = shipping === 1;

    const products = new productModel({ ...req.fields, slug: slugify(name) });
    if (photo) {
      products.photo.data = fs.readFileSync(photo.path);
      products.photo.contentType = photo.type;
    }
    await products.save();
    res.status(201).send({
      success: true,
      message: "Product created successfully",
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      error,
      message: "Error in creating product",
    });
  }
};

// Get all products
export const getProductController = async (req, res) => {
  try {
    const products = await productModel
      .find({})
      .populate("category")
      .select("-photo")
      .limit(12)
      .sort({ createdAt: -1 });

    res.status(200).send({
      success: true,
      countTotal: products.length,
      message: "All products ",
      products,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      success: false,
      message: "Error while getting products",
      error: error.message,
    });
  }
};

// Get single product
export const getSingleProductController = async (req, res) => {
  try {
    const product = await productModel
      .findOne({ slug: req.params.slug })
      .select("-photo")
      .populate("category");

    if (!product) {
      return res.status(404).send({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).send({
      success: true,
      message: "Single product fetched",
      product,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      success: false,
      message: "Error while getting single product",
      error: error.message,
    });
  }
};

// Get photo
export const productPhotoController = async (req, res) => {
  try {
    const product = await productModel.findById(req.params.pid).select("photo");

    if (!product || !product.photo?.data) {
      return res.status(404).send({
        success: false,
        message: "Photo not found",
      });
    }

    res.set("Content-Type", product.photo.contentType || "image/jpeg");
    return res.status(200).send(product.photo.data);
  } catch (error) {
    console.error(error);
    res.status(500).send({
      success: false,
      message: "Error while getting photo",
      error: error.message,
    });
  }
};

// delete controller
export const deleteProductController = async (req, res) => {
  try {
    const deletedProduct = await productModel
      .findByIdAndDelete(req.params.pid)
      .select("-photo");

    if (!deletedProduct) {
      return res.status(404).send({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).send({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error while deleting product",
      error,
    });
  }
};

// update products
export const updateProductController = async (req, res) => {
  try {
    const { name, description, price, category, quantity, shipping } =
      req.fields;
    const { photo } = req.files;
    // validation
    switch (true) {
      case !name:
        return res.status(400).send({ error: "Name is required" });
      case !description:
        return res.status(400).send({ error: "Description is required" });
      case !price:
        return res.status(400).send({ error: "Price is required" });
      case !category:
        return res.status(400).send({ error: "Category is required" });
      case !quantity:
        return res.status(400).send({ error: "Quantity is required" });
      case photo && photo.size > 1000000:
        return res
          .status(413)
          .send({ error: "Photo is required and should be less then 1MB" });
    }

    const products = await productModel.findByIdAndUpdate(
      req.params.pid,
      { ...req.fields, slug: slugify(name) },
      { new: true }
    );

    if (!products) {
      return res.status(404).send({
        success: false,
        message: "Product not found",
      });
    }

    if (photo) {
      products.photo.data = fs.readFileSync(photo.path);
      products.photo.contentType = photo.type;
    }
    await products.save();
    res.status(201).send({
      success: true,
      message: "Product updated successfully",
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      error,
      message: "Error in updating product",
    });
  }
};

// Get filtered products
export const productFiltersController = async (req, res) => {
  try {
    const { checked = [], radio = [] } = req.body;

    const args = {};
    // Set category filters
    if (Array.isArray(checked) && checked.length > 0) {
      args.category = { $in: checked };
    }
    // Set price range filter
    if (Array.isArray(radio) && radio.length === 2) {
      const [min, max] = radio.map(Number);
      if (!Number.isNaN(min) && !Number.isNaN(max)) {
        args.price = { $gte: min, $lte: max };
      }
    }

    const products = await productModel.find(args).select("-photo");

    res.status(200).send({
      success: true,
      products,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      success: false,
      message: "Error while filtering products",
      error: error.message,
    });
  }
};

// Get total product count
export const productCountController = async (req, res) => {
  try {
    const total = await productModel.estimatedDocumentCount();

    res.status(200).send({
      success: true,
      total,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "Error in product count",
      error: error.message,
      success: false,
    });
  }
};

// Get products by page
export const productListController = async (req, res) => {
  try {
    const page = parseInt(req.params.page, 10) || DEFAULT_PAGE_NUMBER;

    const products = await productModel
      .find({})
      .select("-photo")
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * DEFAULT_PAGE_SIZE)
      .limit(DEFAULT_PAGE_SIZE);

    res.status(200).send({
      success: true,
      products,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      success: false,
      message: "Error in per page product controller",
      error: error.message,
    });
  }
};

// Search products by name or description
export const searchProductController = async (req, res) => {
  try {
    const searchKeyword = (req.params.keyword || "").trim();
    if (!searchKeyword) {
      return res.json([]);
    }

    const results = await productModel
      .find({
        $or: [
          { name: { $regex: searchKeyword, $options: "i" } },
          { description: { $regex: searchKeyword, $options: "i" } },
        ],
      })
      .select("-photo");

    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).send({
      success: false,
      message: "Error in Search Product API",
      error: error.message,
    });
  }
};

// Get related products
export const relatedProductController = async (req, res) => {
  try {
    const { pid, cid } = req.params;

    // Required params
    if (!pid || !cid) {
      return res.status(400).send({
        success: false,
        message: "Missing required params: 'pid' and 'cid' are required.",
      });
    }

    // Validate ObjectId
    if (!mongoose.isValidObjectId(pid) || !mongoose.isValidObjectId(cid)) {
      return res.status(400).send({
        success: false,
        message: "Invalid 'pid' or 'cid' format.",
      });
    }

    // Check existence of category and product
    const [catExists, prod] = await Promise.all([
      categoryModel.exists({ _id: cid }),
      productModel.findById(pid).select("_id category"),
    ]);

    if (!prod) {
      return res.status(404).send({
        success: false,
        message: "Product not found",
      });
    }
    if (!catExists) {
      return res.status(404).send({
        success: false,
        message: "Category not found",
      });
    }

    // Query for related products
    const products = await productModel
      .find({ category: cid, _id: { $ne: pid } })
      .select("-photo")
      .limit(3)
      .populate("category");

    return res.status(200).send({
      success: true,
      products,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      success: false,
      message: "Error while getting related products",
      error: error.message,
    });
  }
};

// Get category products by page
export const productCategoryController = async (req, res) => {
  try {
    const category = await categoryModel.findOne({ slug: req.params.slug });
    if (!category) {
      return res.status(404).send({
        success: false,
        message: "Category not found",
      });
    }

    const page = parseInt(req.query.page, 10) || DEFAULT_PAGE_NUMBER;
    const limit = parseInt(req.query.limit, 10) || DEFAULT_PAGE_SIZE;

    const products = await productModel
      .find({ category: category._id })
      .select("-photo")
      .populate("category")
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).send({
      success: true,
      category,
      products,
      page,
      limit,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      success: false,
      error: error.message,
      message: "Error while getting products by category",
    });
  }
};

// Get total product count by category
export const productCategoryCountController = async (req, res) => {
  try {
    const category = await categoryModel.findOne({ slug: req.params.slug });
    if (!category) {
      return res.status(404).send({
        success: false,
        message: "Category not found",
      });
    }

    const total = await productModel.countDocuments({ category: category._id });

    res.status(200).send({
      success: true,
      total,
      category,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      success: false,
      error: error.message,
      message: "Error while getting products count",
    });
  }
};

// payment gateway api
// token
const generateClientToken = (opts = {}) =>
  new Promise((resolve, reject) =>
    gateway.clientToken.generate(opts, (err, res) =>
      err ? reject(err) : resolve(res)
    )
  );

export const braintreeTokenController = async (req, res) => {
  try {
    const { clientToken } = await generateClientToken({});
    return res.status(200).send({ success: true, clientToken });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "Failed to generate client token",
      error: String(error),
    });
  }
};

// payment
const sale = (opts) =>
  new Promise((resolve, reject) =>
    gateway.transaction.sale(opts, (err, res) =>
      err ? reject(err) : resolve(res)
    )
  );

export const brainTreePaymentController = async (req, res) => {
  try {
    const { nonce, cart } = req.body || {};

    if (!nonce || !Array.isArray(cart) || cart.length === 0) {
      return res.status(400).send({
        success: false,
        message: "Missing payment nonce or empty cart",
      });
    }

    const totalCents = cart.reduce((sum, item) => {
      const price = Number(item.price);
      const qty = Number(item.quantity ?? 1);
      if (Number.isNaN(price) || Number.isNaN(qty) || price < 0 || qty <= 0)
        return sum;
      return sum + Math.round(price * 100) * qty;
    }, 0);
    const amount = (totalCents / 100).toFixed(2);

    const result = await sale({
      amount,
      paymentMethodNonce: nonce,
      options: { submitForSettlement: true },
    });

    if (!result?.success) {
      return res.status(402).send({
        success: false,
        message: "Payment failed",
        processorResponse: result?.message ?? "Unknown error",
      });
    }

    // decrement stock guarded
    try {
      const decremented = [];
      for (const item of cart) {
        const qty = Number(item.quantity ?? 1);
        if (!Number.isFinite(qty) || qty <= 0) continue;

        const upd = await productModel.updateOne(
          { _id: item._id, quantity: { $gte: qty } },
          { $inc: { quantity: -qty } }
        );

        if (upd.modifiedCount !== 1) {
          // rollback
          for (const done of decremented) {
            await productModel.updateOne(
              { _id: done._id },
              { $inc: { quantity: done.qty } }
            );
          }

          return res.status(409).send({
            success: false,
            message: "Insufficient quantity for one or more items",
            itemId: item._id,
          });
        }
        decremented.push({ _id: item._id, qty });
      }
    } catch (error) {
      return res.status(500).send({
        success: false,
        message: "Stock update failed",
      });
    }

    await orderModel.create({
      products: cart,
      payment: result,
      buyer: req.user?._id ?? req.user?.id ?? null,
    });

    return res.status(201).send({
      success: true,
      ok: true,
      transactionId: result.transaction?.id ?? null,
      amount,
    });
  } catch (error) {
    return res.status(500).send({
      success: false,
      message: "Payment error",
      error: String(error),
    });
  }
};

export const checkInventoryController = async (req, res) => {
  try {
    const { cart = [] } = req.body || {};
    if (!Array.isArray(cart) || cart.length === 0) {
      return res.status(400).send({ success: false, message: "Empty cart" });
    }
    for (const item of cart) {
      const qty = Number(item.quantity ?? 1);
      if (!item._id || !Number.isFinite(qty) || qty <= 0) {
        return res.status(400).send({ success: false, message: "Bad cart item" });
      }
      const doc = await productModel.findById(item._id).select("quantity");
      if (!doc || doc.quantity < qty) {
        return res.status(409).send({
          success: false,
          message: "Insufficient stock",
          itemId: item._id,
          available: doc?.quantity ?? 0,
        });
      }
    }
    return res.status(200).send({ success: true });
  } catch (e) {
    return res.status(500).send({ success: false, message: "Inventory check failed" });
  }
};

