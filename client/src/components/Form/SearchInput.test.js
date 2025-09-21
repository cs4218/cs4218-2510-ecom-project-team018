import React from "react";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import toast from 'react-hot-toast';
import { MemoryRouter } from "react-router-dom";
import SearchInput from "./SearchInput";

jest.mock('react-hot-toast');

jest.mock("axios");

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

jest.mock("../../context/search", () => {
  const React = require("react");
  return {
    useSearch: jest.fn(() => React.useState({ keyword: "", results: [] })),
  };
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("SearchInput", () => {
  it("renders search input and button", async () => {
    render(
      <MemoryRouter>
        <SearchInput />
      </MemoryRouter>
    );

    expect(await screen.findByRole("searchbox")).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: /search/i })
    ).toBeInTheDocument();
  });

  it("updates keyword on input change", async () => {
      render(
          <MemoryRouter>
          <SearchInput />
          </MemoryRouter>
      );

      const input = await screen.findByRole("searchbox");
      await act(async () => {
          await userEvent.type(input, "laptop");
      });

      expect(input).toHaveValue("laptop");
  });

  it("submits the form and navigates to /search when Search Button is Pressed", async () => {
      render(
          <MemoryRouter>
              <SearchInput />
          </MemoryRouter>
      );

      axios.get.mockImplementation((url) => {
          if (url === '/api/v1/product/search/laptop') {
              return Promise.resolve({ data: [{ _id: '1', name: 'Laptop 1' }] });
          }
      });

      const input = await screen.findByRole("searchbox");
      const button = await screen.findByRole("button", { name: /search/i });
      await act(async () => {
          await userEvent.type(input, "laptop");
          await userEvent.click(button);
      });

      expect(mockNavigate).toHaveBeenCalledWith("/search");

  });

  it("should display an error toast if the Search API is faulty", async () => {
      render(
          <MemoryRouter>
              <SearchInput />
          </MemoryRouter>
      );

      axios.get.mockImplementation((url) => {
          if (url === '/api/v1/product/search/laptop') {
              return Promise.reject(new Error("Search API failed"));
          }
      });

      const input = await screen.findByRole("searchbox");
      const button = await screen.findByRole("button", { name: /search/i });

      await act(async () => {
          await userEvent.type(input, "laptop");
          await userEvent.click(button);
      });

      expect(toast.error).toHaveBeenCalledWith("Search API failed");
  });
})
