import userModel from "../models/userModel.js";
import orderModel from "../models/orderModel.js";

import { comparePassword, hashPassword } from "./../helpers/authHelper.js";
import JWT from "jsonwebtoken";

export const registerController = async (req, res) => {
  try {
    const { name, email, password, phone, address, answer } = req.body;

    const missing = [];
    if (!name) missing.push("Name");
    if (!email) missing.push("Email");
    if (!password) missing.push("Password");
    if (!phone) missing.push("Phone");
    if (!address) missing.push("Address");
    if (!answer) missing.push("Answer");

    //validations
    if (missing.length > 0) {
      return res.status(400).send({
        success: false,
        message: `Missing required fields: ${missing.join(", ")}`,
      });
    }
    //check user
    const exisitingUser = await userModel.findOne({ email });
    //exisiting user
    if (exisitingUser) {
      return res.status(400).send({
        success: false,
        message: "Already Registered, please login",
      });
    }
    //register user
    const hashedPassword = await hashPassword(password);
    //save
    const user = await new userModel({
      name,
      email,
      phone,
      address,
      password: hashedPassword,
      answer,
    }).save();

    res.status(201).send({
      success: true,
      message: "User Register Successfully",
      user,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Error in Registeration",
      error,
    });
  }
};

//POST LOGIN
export const loginController = async (req, res) => {
  try {
    const { email, password } = req.body;
    //validation
    const missing = [];
    if (!email) missing.push("Email");
    if (!password) missing.push("Password");

    //validations
    if (missing.length > 0) {
      return res.status(400).send({
        success: false,
        message: `Missing required fields: ${missing.join(", ")}`,
      });
    }
    //check user
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(404).send({
        success: false,
        message: "Email is not registerd",
      });
    }
    const match = await comparePassword(password, user.password);
    if (!match) {
      return res.status(400).send({
        success: false,
        message: "Invalid Password",
      });
    }
    //token
    const token = await JWT.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    res.status(200).send({
      success: true,
      message: "login successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Error in login",
      error,
    });
  }
};

//forgotPasswordController

export const forgotPasswordController = async (req, res) => {
  try {
    const { email, answer, newPassword } = req.body;
    const missing = [];
    if (!email) missing.push("Email");
    if (!answer) missing.push("Answer");
    if (!newPassword) missing.push("New Password");

    //validations
    if (missing.length > 0) {
      return res.status(400).send({
        message: `Missing required fields: ${missing.join(", ")}`,
      });
    }
    //check
    const user = await userModel.findOne({ email, answer });
    //validation
    if (!user) {
      return res.status(404).send({
        success: false,
        message: "Wrong Email Or Answer",
      });
    }
    const hashed = await hashPassword(newPassword);
    await userModel.findByIdAndUpdate(user._id, { password: hashed });
    res.status(200).send({
      success: true,
      message: "Password Reset Successfully",
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Something went wrong",
      error,
    });
  }
};

//test controller
export const testController = (req, res) => {
  try {
    res.send("Protected Routes");
  } catch (error) {
    res.send({ error });
  }
};

//update profile
export const updateProfileController = async (req, res) => {
  try {
    const { name, email, password, address, phone } = req.body;
    const user = await userModel.findById(req.user._id);

    if (password && password.length < 6) {
      return res.status(400).send({ message: "Password is required and 6 character long" });
    }

    if (user === null) {
      return res.status(400).send({ message: "User is not found" });
    }

    if (!name && !password && !address && !phone) {
      return res.status(400).send({ message: "Change Name, Password, Address or Phone to Update profile" });
    }
    
    const hashedPassword = password ? await hashPassword(password) : undefined;
    const updatedUser = await userModel.findByIdAndUpdate(
      req.user._id,
      {
        name: name || user.name,
        password: hashedPassword || user.password,
        phone: phone || user.phone,
        address: address || user.address,
      },
      { new: true }
    );
    
    res.status(200).send({
      success: true,
      message: "Profile Updated Successfully",
      updatedUser: {
        name: updatedUser.name,
        phone: updatedUser.phone,
        address: updatedUser.address
      },
    });
  } catch (error) {
    res.status(400).send({
      success: false,
      message: "Error While Updating profile",
      error,
    });
  }
};

//orders
export const getOrdersController = async (req, res) => {
  try {
    const orders = await orderModel
      .find({ buyer: req.user._id })
      .populate("products", "-photo")
      .populate("buyer", "name");
    res.status(200).send(orders);
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Error While Getting Orders",
      error,
    });
  }
};
//orders
export const getAllOrdersController = async (req, res) => {
  try {
    const orders = await orderModel
      .find({})
      .populate("products", "-photo")
      .populate("buyer", "name")
      .sort({ createdAt: "-1" });
    res.status(200).send(orders);
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Error While Getting All Orders",
      error,
    });
  }
};

//order status
export const orderStatusController = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const orders = await orderModel.findByIdAndUpdate(
      orderId,
      { status },
      { new: true }
    );
    res.status(200).send(orders);
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Error While Updating Order Status",
      error,
    });
  }
};
