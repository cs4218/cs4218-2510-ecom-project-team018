import {
  registerController,
  loginController,
  forgotPasswordController,
  testController,
  updateProfileController,
  getOrdersController,
  getAllOrdersController,
  orderStatusController,
  getAllUsersController,
} from "./authController.js";
import userModel from "../models/userModel.js";
import orderModel from "../models/orderModel.js";
import { comparePassword, hashPassword } from "../helpers/authHelper.js";
import JWT from "jsonwebtoken";
import { describe } from "node:test";
import mongoose from "mongoose";

// Mock dependencies
jest.mock("../models/userModel.js");
jest.mock("../models/orderModel.js");
jest.mock("../helpers/authHelper.js");
jest.mock("jsonwebtoken");

// Mock data
const MOCK_USER_DATA = {
  _id: "user123",
  name: "John Doe",
  email: "john@example.com",
  phone: "1234567890",
  address: "123 Main St",
  password: "hashedPassword123",
  role: "user",
  answer: "mockAnswer",
};

const MOCK_REQUEST_DATA = {
  name: "John Doe",
  email: "john@example.com",
  password: "password123",
  phone: "1234567890",
  address: "123 Main St",
  answer: "mockAnswer",
};

const MOCK_REQUEST_USER = {
  user: {
    _id: "user123",
  },
};

const MOCK_ORDER_DATA = [
  {
    _id: "order1",
    products: [new mongoose.Types.ObjectId()],
    payment: {
      success: true,
    },
    buyer: new mongoose.Types.ObjectId(),
    status: "Processing",
  },
];

const MOCK_REQUEST_PARAM = {
  orderId: new mongoose.Types.ObjectId(),
};

const MOCK_ORDER_STATUS_BODY = {
  status: "Shipped",
};

// status codes
const SUCCESS_STATUS = 200;
const SERVER_ERROR_STATUS = 500;

// Mock response object
const createMockRes = () => ({
  status: jest.fn().mockReturnThis(),
  send: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

describe("Auth Controller", () => {
  let mockReq, mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = { body: {} };
    mockRes = createMockRes();

    // Default JWT mock
    JWT.sign.mockResolvedValue("mock-jwt-token");
  });

  describe("registerController", () => {
    it("should handle missing required fields validation", async () => {
      mockReq.body = {};

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message:
          "Missing required fields: Name, Email, Password, Phone, Address, Answer",
      });
    });

    it("should handle existing user", async () => {
      mockReq.body = MOCK_REQUEST_DATA;
      userModel.findOne.mockResolvedValue(MOCK_USER_DATA);

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Already Registered, please login",
      });
    });

    it("should successfully register new user", async () => {
      mockReq.body = MOCK_REQUEST_DATA;
      userModel.findOne.mockResolvedValue(null);
      hashPassword.mockResolvedValue("hashedPassword123");

      const mockSave = jest.fn().mockResolvedValue(MOCK_USER_DATA);
      userModel.mockImplementation(() => ({ save: mockSave }));

      await registerController(mockReq, mockRes);

      expect(hashPassword).toHaveBeenCalledWith("password123");
      expect(mockSave).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: true,
        message: "User Register Successfully",
        user: MOCK_USER_DATA,
      });
    });

    it("should handle registration errors", async () => {
      mockReq.body = MOCK_REQUEST_DATA;
      userModel.findOne.mockRejectedValue(new Error("Database error"));

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Error in Registeration",
        error: expect.any(Error),
      });
    });
  });

  describe("loginController", () => {
    it("should handle missing email or password", async () => {
      mockReq.body = {};

      await loginController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Missing required fields: Email, Password",
        success: false,
      });
    });

    it("should handle user not found", async () => {
      mockReq.body = {
        ...MOCK_REQUEST_DATA,
        email: "nonexistent@example.com",
      };
      userModel.findOne.mockResolvedValue(null);

      await loginController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Email is not registerd",
      });
    });

    it("should handle invalid password", async () => {
      mockReq.body = {
        ...MOCK_REQUEST_DATA,
        password: "wrongpassword",
      };
      userModel.findOne.mockResolvedValue(MOCK_USER_DATA);
      comparePassword.mockResolvedValue(false);

      await loginController(mockReq, mockRes);

      expect(comparePassword).toHaveBeenCalledWith(
        "wrongpassword",
        "hashedPassword123"
      );
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Invalid Password",
      });
    });

    it("should successfully login user", async () => {
      mockReq.body = MOCK_REQUEST_DATA;
      userModel.findOne.mockResolvedValue(MOCK_USER_DATA);
      comparePassword.mockResolvedValue(true);

      await loginController(mockReq, mockRes);

      expect(JWT.sign).toHaveBeenCalledWith(
        { _id: "user123" },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: true,
        message: "login successfully",
        user: {
          _id: "user123",
          name: "John Doe",
          email: "john@example.com",
          phone: "1234567890",
          address: "123 Main St",
          role: "user",
        },
        token: "mock-jwt-token",
      });
    });

    it("should handle login errors", async () => {
      mockReq.body = MOCK_REQUEST_DATA;
      userModel.findOne.mockRejectedValue(new Error("Database error"));

      await loginController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Error in login",
        error: expect.any(Error),
      });
    });
  });

  describe("forgotPasswordController", () => {
    it("should handle missing required fields", async () => {
      mockReq.body = {};

      await forgotPasswordController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Missing required fields: Email, Answer, New Password",
      });
    });

    it("should handle user not found with email/answer combination", async () => {
      mockReq.body = {
        ...MOCK_REQUEST_DATA,
        email: "nonexistent@example.com",
        answer: "wrongAnswer",
        newPassword: "newPassword123",
      };
      userModel.findOne.mockResolvedValue(null);

      await forgotPasswordController(mockReq, mockRes);

      expect(userModel.findOne).toHaveBeenCalledWith({
        email: "nonexistent@example.com",
        answer: "wrongAnswer",
      });
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Wrong Email Or Answer",
      });
    });

    it("should successfully reset password", async () => {
      mockReq.body = {
        ...MOCK_REQUEST_DATA,
        newPassword: "newPassword123",
      };
      userModel.findOne.mockResolvedValue(MOCK_USER_DATA);
      hashPassword.mockResolvedValue("newHashedPassword");
      userModel.findByIdAndUpdate.mockResolvedValue();

      await forgotPasswordController(mockReq, mockRes);

      expect(hashPassword).toHaveBeenCalledWith("newPassword123");
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith("user123", {
        password: "newHashedPassword",
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: true,
        message: "Password Reset Successfully",
      });
    });

    it("should handle forgot password errors", async () => {
      mockReq.body = {
        ...MOCK_REQUEST_DATA,
        newPassword: "newPassword123",
      };
      userModel.findOne.mockRejectedValue(new Error("Database error"));

      await forgotPasswordController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Something went wrong",
        error: expect.any(Error),
      });
    });
  });

  describe("testController", () => {
    it("should return protected routes message", () => {
      testController(mockReq, mockRes);

      expect(mockRes.send).toHaveBeenCalledWith("Protected Routes");
    });

    it("should handle test controller errors", () => {
      mockRes.send = jest.fn(() => {
        throw new Error("Send error");
      });

      expect(() => testController(mockReq, mockRes)).toThrow();
    });
  });

  describe("updateProfileController", () => {
    it("should handle password length less than 6 with error in response", async () => {
      mockReq.body = {
        ...MOCK_REQUEST_DATA,
        password: "abcde",
      };

      mockReq.user = MOCK_REQUEST_USER;

      userModel.findById.mockResolvedValue(MOCK_USER_DATA);

      await updateProfileController(mockReq, mockRes);
      expect(hashPassword).not.toHaveBeenCalled();
      expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Password is required and 6 character long",
      });
    });

    it("should handle user not found with the req.user._id", async () => {
      mockReq.body = MOCK_REQUEST_DATA;
      mockReq.user = MOCK_REQUEST_USER;
      userModel.findById.mockResolvedValue(null); //findById returns null when there is no document found

      await updateProfileController(mockReq, mockRes);
      expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "User is not found",
      });
    });

    it("should successfully update users", async () => {
      mockReq.body = MOCK_REQUEST_DATA;
      mockReq.user = MOCK_REQUEST_USER;

      userModel.findById.mockResolvedValue(MOCK_USER_DATA);
      hashPassword.mockResolvedValue("newHashedPassword");
      userModel.findByIdAndUpdate.mockResolvedValue({
        name: mockReq.body.name,
        password: "newHashedPassword",
        phone: mockReq.body.phone,
        address: mockReq.body.address,
      });

      await updateProfileController(mockReq, mockRes);

      expect(hashPassword).toHaveBeenCalledWith(mockReq.body.password);

      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockReq.user._id,
        {
          name: mockReq.body.name,
          password: "newHashedPassword",
          phone: mockReq.body.phone,
          address: mockReq.body.address,
        },
        { new: true }
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: true,
        message: "Profile Updated Successfully",
        updatedUser: {
          name: mockReq.body.name,
          phone: mockReq.body.phone,
          address: mockReq.body.address,
        },
      });
    });

    it("should update user without changing password, name, phone, or address if not provided", async () => {
      mockReq.body = {
        name: null,
        phone: null,
        address: null,
        password: undefined,
      };
      mockReq.user = MOCK_REQUEST_USER;

      userModel.findById.mockResolvedValue(MOCK_USER_DATA);
      userModel.findByIdAndUpdate.mockResolvedValue(MOCK_USER_DATA);

      await updateProfileController(mockReq, mockRes);

      expect(hashPassword).not.toHaveBeenCalled();

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Change Name, Password, Address or Phone to Update profile",
      });
    });

    it("should handle update Profile Controller Errors", async () => {
      mockReq.body = MOCK_REQUEST_DATA;
      userModel.findById.mockRejectedValue(new Error("Database error"));

      await updateProfileController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Error While Updating profile",
        error: expect.any(Error),
      });
    });
  });

  describe("getOrdersController", () => {
    it("should return orders successfully", async () => {
      mockReq.user = MOCK_REQUEST_USER;
      const mockOrders = MOCK_ORDER_DATA;

      const populateBuyer = jest.fn().mockResolvedValue(mockOrders);
      const populateProducts = jest.fn(() => ({ populate: populateBuyer }));
      orderModel.find.mockReturnValue({ populate: populateProducts });

      await getOrdersController(mockReq, mockRes);

      expect(orderModel.find).toHaveBeenCalledWith({ buyer: mockReq.user._id });
      expect(populateProducts).toHaveBeenCalledWith("products", "-photo");
      expect(populateBuyer).toHaveBeenCalledWith("buyer", "name");

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith(mockOrders);
    });

    it("should handle getOrdersController errors", async () => {
      orderModel.find.mockRejectedValue(new Error("Database error"));

      await getOrdersController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Error While Getting Orders",
        error: expect.any(Error),
      });
    });
  });

  describe("getAllOrdersController", () => {
    it("should return orders successfully", async () => {
      mockReq.user = MOCK_REQUEST_USER;
      const mockOrders = MOCK_ORDER_DATA;

      //find -> populate("products") -> populate("buyer") -> sort
      const sort = jest.fn().mockResolvedValue(mockOrders);
      const populateBuyer = jest.fn(() => ({ sort }));
      const populateProducts = jest.fn(() => ({ populate: populateBuyer }));

      orderModel.find.mockReturnValue({ populate: populateProducts });

      await getAllOrdersController(mockReq, mockRes);

      expect(orderModel.find).toHaveBeenCalledWith({});
      expect(populateProducts).toHaveBeenCalledWith("products", "-photo");
      expect(populateBuyer).toHaveBeenCalledWith("buyer", "name");
      expect(sort).toHaveBeenCalledWith({ createdAt: -1 });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith(mockOrders);
    });

    it("should handle getAllOrdersController errors", async () => {
      orderModel.find.mockRejectedValue(new Error("Database error"));

      await getAllOrdersController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Error While Getting All Orders",
        error: expect.any(Error),
      });
    });
  });

  describe("orderStatusController", () => {
    it("should update order status successfully", async () => {
      mockReq.params = MOCK_REQUEST_PARAM;
      mockReq.body = MOCK_ORDER_STATUS_BODY;
      orderModel.findByIdAndUpdate.mockReturnValue({
        ...MOCK_ORDER_DATA,
        status: mockReq.body.status,
      });

      await orderStatusController(mockReq, mockRes);

      expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockReq.params.orderId,
        { status: mockReq.body.status },
        { new: true }
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({
        ...MOCK_ORDER_DATA,
        status: mockReq.body.status,
      });
    });

    it("should handle orderStatusController errors", async () => {
      orderModel.findByIdAndUpdate.mockRejectedValue(
        new Error("Database error")
      );

      await orderStatusController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Error While Updating Order Status",
        error: expect.any(Error),
      });
    });
  });

  describe("getAllUsersController", () => {
    it("should return the list of users", async () => {
      mockRes = createMockRes();
      const sortMock = jest.fn().mockResolvedValue([MOCK_USER_DATA]);
      userModel.find.mockReturnValue({ sort: sortMock });

      await getAllUsersController({}, mockRes);

      expect(userModel.find).toHaveBeenCalledWith({}, "-password -answer");
      expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
      expect(mockRes.status).toHaveBeenCalledWith(SUCCESS_STATUS);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: true,
        message: "Users fetched successfully",
        users: [MOCK_USER_DATA],
      });
    });

    it("should handle errors while fetching users", async () => {
      mockRes = createMockRes();
      const sortMock = jest.fn().mockRejectedValue(new Error("Database error"));
      userModel.find.mockReturnValue({ sort: sortMock });

      await getAllUsersController({}, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(SERVER_ERROR_STATUS);
      expect(mockRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error while fetching users",
        })
      );
    });
  });
});
