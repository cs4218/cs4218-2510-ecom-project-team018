import categoryModel from "../models/categoryModel.js";
import slugify from "slugify";

export const createCategoryController = async (req, res) => {
  try {
    const allowedFields = ["name"];
    const { name } = req.body;

    // Mass Assignment Vulnerability Guard
    const extraFields = Object.keys(req.body).filter(
      key => !allowedFields.includes(key)
    );

    if (extraFields.length > 0) {
      return res.status(400).send({
        success: false,
        message: `Unexpected fields: ${extraFields.join(", ")}`,
      });
    }
    if (!name) {
      return res.status(401).send({ message: "Name is required" });
    }

    if (typeof name !== "string") {
      return res.status(401).send({ message: "Valid name is required" });
    }

    const existingCategory = await categoryModel.findOne({
      name: { $eq: String(name) }
    });

    if (existingCategory) {
      return res.status(200).send({
        success: true,
        message: "Category already exists",
      });
    }
    const category = await new categoryModel({
      name,
      slug: slugify(name),
    }).save();
    res.status(201).send({
      success: true,
      message: "New category created",
      category,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error in category",
    });
  }
};

//update category
export const updateCategoryController = async (req, res) => {
  try {
    const { name } = req.body;
    const { id } = req.params;
    const category = await categoryModel.findByIdAndUpdate(
      id,
      { name, slug: slugify(name) },
      { new: true }
    );
    res.status(200).send({
      success: true,
      message: "Category updated successfully",
      category,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error while updating category",
    });
  }
};

// get all cat
export const categoryController = async (req, res) => {
  try {
    const category = await categoryModel.find({});
    res.status(200).send({
      success: true,
      message: "All categories list",
      category,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error while getting all categories",
    });
  }
};

// single category
export const singleCategoryController = async (req, res) => {
  try {
    const category = await categoryModel.findOne({ slug: req.params.slug });
    res.status(200).send({
      success: true,
      message: "Get single category successfully",
      category,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error while getting single category",
    });
  }
};

//delete category
export const deleteCategoryController = async (req, res) => {
  try {
    const { id } = req.params;
    await categoryModel.findByIdAndDelete(id);
    res.status(200).send({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "error while deleting category",
    });
  }
};