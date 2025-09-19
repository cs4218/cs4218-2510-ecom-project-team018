import {
  registerController,
  loginController,
  forgotPasswordController,
  testController,
} from "./authController.js";
import userModel from "../models/userModel.js";
import { comparePassword, hashPassword } from "../helpers/authHelper.js";
import JWT from "jsonwebtoken";

// Mock dependencies
jest.mock("../models/userModel.js");
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

      expect(mockRes.status).toHaveBeenCalledWith(200);
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

      expect(mockRes.status).toHaveBeenCalledWith(200);
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
      expect(mockRes.status).toHaveBeenCalledWith(200);
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
});
