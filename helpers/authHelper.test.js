import bcrypt from "bcrypt";
import { hashPassword, comparePassword } from "./authHelper.js";

// Mock bcrypt to control behavior in tests
jest.mock("bcrypt");
const mockedBcrypt = bcrypt;

const HASHED_PASSWORD = "$2b$10$hashedPasswordExample";

describe("authHelper", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  describe("hashPassword", () => {
    it("should hash a valid password successfully", async () => {
      const password = "validPassword123";
      mockedBcrypt.hash.mockResolvedValue(HASHED_PASSWORD);

      const result = await hashPassword(password);

      expect(mockedBcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(result).toBe(HASHED_PASSWORD);
    });

    it("should handle empty string password", async () => {
      const password = "";
      mockedBcrypt.hash.mockResolvedValue(HASHED_PASSWORD);

      const result = await hashPassword(password);

      expect(mockedBcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(result).toBe(HASHED_PASSWORD);
    });

    it("should handle very long password (boundary test)", async () => {
      const password = "a".repeat(72);
      mockedBcrypt.hash.mockResolvedValue(HASHED_PASSWORD);

      const result = await hashPassword(password);

      expect(mockedBcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(result).toBe(HASHED_PASSWORD);
    });

    it("should handle special characters in password", async () => {
      const password = "!@#$%^&*()_+-=[]{}|;':\",./<>?";
      mockedBcrypt.hash.mockResolvedValue(HASHED_PASSWORD);

      const result = await hashPassword(password);

      expect(mockedBcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(result).toBe(HASHED_PASSWORD);
    });

    it("should handle bcrypt error and throw it", async () => {
      const password = "a".repeat(73);
      const error = new Error("Bcrypt hashing failed");
      mockedBcrypt.hash.mockRejectedValue(error);

      await expect(hashPassword(password)).rejects.toThrow(error);

      expect(mockedBcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(console.log).toHaveBeenCalledWith(error);
    });
  });

  describe("comparePassword", () => {
    it("should return true for matching password and hash", async () => {
      const password = "correctPassword";
      mockedBcrypt.compare.mockResolvedValue(true);

      const result = await comparePassword(password, HASHED_PASSWORD);

      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        password,
        HASHED_PASSWORD
      );
      expect(result).toBe(true);
    });

    it("should return false for non-matching password and hash", async () => {
      const password = "wrongPassword";
      mockedBcrypt.compare.mockResolvedValue(false);

      const result = await comparePassword(password, HASHED_PASSWORD);

      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        password,
        HASHED_PASSWORD
      );
      expect(result).toBe(false);
    });

    it("should handle empty password comparison", async () => {
      const password = "";
      mockedBcrypt.compare.mockResolvedValue(false);

      const result = await comparePassword(password, HASHED_PASSWORD);

      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        password,
        HASHED_PASSWORD
      );
      expect(result).toBe(false);
    });

    it("should handle bcrypt comparison error", async () => {
      const password = "validPassword";
      const error = new Error("Bcrypt comparison failed");
      mockedBcrypt.compare.mockRejectedValue(error);

      await expect(comparePassword(password, HASHED_PASSWORD)).rejects.toThrow(
        error
      );
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        password,
        HASHED_PASSWORD
      );
    });

    it("should handle special characters in password comparison", async () => {
      const password = "!@#$%^&*()_+-=[]{}|;':\",./<>?";
      mockedBcrypt.compare.mockResolvedValue(true);

      const result = await comparePassword(password, HASHED_PASSWORD);

      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        password,
        HASHED_PASSWORD
      );
      expect(result).toBe(true);
    });
  });
});
