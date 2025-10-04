import mongoose from "mongoose";
import connectDB from "./db";

// Mock mongoose
jest.mock("mongoose", () => ({
    __esModule: true,
    default: { connect: jest.fn() },
}));

describe("db", () => {
    const OLD_ENV = process.env;
    let logSpy;

    beforeEach(() => {
        process.env = { ...OLD_ENV, MONGO_URL: "mongodb://testdb" };
        logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    });

    afterEach(() => {
        process.env = OLD_ENV;
        jest.clearAllMocks();
        logSpy.mockRestore();
    });

    test("calls mongoose.connect and logs success host", async () => {
        mongoose.connect.mockResolvedValue({
            connection: { host: "testhost" },
        });
        await connectDB();
        expect(mongoose.connect).toHaveBeenCalledWith("mongodb://testdb");
        expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining("Connected To Mongodb Database testhost")
        );
    });

    test("logs error when mongoose.connect rejects", async () => {
        const err = new Error("connection failed");
        mongoose.connect.mockRejectedValue(err);
        await connectDB();
        expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining("Error in Mongodb")
        );
        expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining("connection failed")
        );
    });

    test("logs error when MONGO_URL is missing", async () => {
        delete process.env.MONGO_URL;
        const err = new Error("MONGO_URL not set");
        mongoose.connect.mockRejectedValue(err);
        await connectDB();
        expect(mongoose.connect).toHaveBeenCalledWith(undefined);
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("MONGO_URL not set"));
    });
});