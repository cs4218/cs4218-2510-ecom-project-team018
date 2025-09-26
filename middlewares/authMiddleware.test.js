import JWT from "jsonwebtoken";
import userModel from "../models/userModel.js";
import { requireSignIn, isAdmin } from "./authMiddleware.js";

// Mock dependencies
jest.mock("jsonwebtoken");
jest.mock("../models/userModel.js");

const mockedJWT = JWT;
const mockedUserModel = userModel;

describe("authMiddleware", () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => {});

    req = {
      headers: {},
      user: null,
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    next = jest.fn();
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  describe("requireSignIn", () => {
    it("should authenticate valid token and call next", async () => {
      const token = "validToken123";
      const decodedUser = { _id: "userId123", email: "test@test.com" };

      req.headers.authorization = token;
      mockedJWT.verify.mockReturnValue(decodedUser);

      await requireSignIn(req, res, next);

      expect(mockedJWT.verify).toHaveBeenCalledWith(
        token,
        process.env.JWT_SECRET
      );
      expect(req.user).toBe(decodedUser);
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it("should handle missing authorization header", async () => {
      const error = new Error("jwt must be provided");
      mockedJWT.verify.mockImplementation(() => {
        throw error;
      });

      await requireSignIn(req, res, next);

      expect(mockedJWT.verify).toHaveBeenCalledWith(
        undefined,
        process.env.JWT_SECRET
      );
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        error,
        message: "Error in sign in verification",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should handle invalid token", async () => {
      const invalidToken = "invalidToken";
      const error = new Error("invalid signature");

      req.headers.authorization = invalidToken;
      mockedJWT.verify.mockImplementation(() => {
        throw error;
      });

      await requireSignIn(req, res, next);

      expect(mockedJWT.verify).toHaveBeenCalledWith(
        invalidToken,
        process.env.JWT_SECRET
      );
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        error,
        message: "Error in sign in verification",
      });
      expect(console.log).toHaveBeenCalledWith(error);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("isAdmin", () => {
    beforeEach(() => {
      req.user = { _id: "userId123" };
    });

    it("should allow admin user and call next", async () => {
      const adminUser = { _id: "userId123", role: 1, email: "admin@test.com" };
      mockedUserModel.findById.mockResolvedValue(adminUser);

      await isAdmin(req, res, next);

      expect(mockedUserModel.findById).toHaveBeenCalledWith("userId123");
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it("should reject non-admin user", async () => {
      const regularUser = { _id: "userId123", role: 0, email: "user@test.com" };
      mockedUserModel.findById.mockResolvedValue(regularUser);

      await isAdmin(req, res, next);

      expect(mockedUserModel.findById).toHaveBeenCalledWith("userId123");
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Unauthorized Access",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should handle user not found", async () => {
      mockedUserModel.findById.mockResolvedValue(null);

      await isAdmin(req, res, next);

      expect(mockedUserModel.findById).toHaveBeenCalledWith("userId123");
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        error: expect.any(TypeError),
        message: "Error in admin middleware",
      });
      expect(console.log).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it("should handle database error", async () => {
      const dbError = new Error("Database connection failed");
      mockedUserModel.findById.mockRejectedValue(dbError);

      await isAdmin(req, res, next);

      expect(mockedUserModel.findById).toHaveBeenCalledWith("userId123");
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        error: dbError,
        message: "Error in admin middleware",
      });
      expect(console.log).toHaveBeenCalledWith(dbError);
      expect(next).not.toHaveBeenCalled();
    });

    it("should handle undefined role as an edge case", async () => {
      const userWithoutRole = { _id: "userId123", email: "user@test.com" };
      mockedUserModel.findById.mockResolvedValue(userWithoutRole);

      await isAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Unauthorized Access",
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});
