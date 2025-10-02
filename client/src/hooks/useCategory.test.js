import { renderHook, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import axios from "axios";
import useCategory from "./useCategory";

// Mock
jest.mock("axios");


describe("useCategory", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("fetches categories and returns them", async () => {
        const mockCats = [{ _id: "1", name: "A"}, { _id: "2", name: "B" }];
        axios.get.mockResolvedValueOnce({ data: { category: mockCats } });
        const { result } = renderHook(() => useCategory());
        //initial state
        expect(result.current).toEqual([]);

        await waitFor(() => expect(result.current).toEqual(mockCats));
        expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
    });

    test("logs error when request fails", async () => {
        const err = new Error("network fail");
        axios.get.mockRejectedValueOnce(err);
        const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
        renderHook(() => useCategory());
        await waitFor(() => expect(axios.get).toHaveBeenCalled());
        expect(logSpy).toHaveBeenCalledWith(err);

        logSpy.mockRestore();
    });
});