import React from "react";
import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import { useSearch, SearchProvider } from "./search";

const MOCK_SEARCH_CONTEXT = {
  keyword: "testing keyword",
  results: [
    {
      category: "66db427fdb0119d9234b27ef",
      createdAt: "2025-09-22T13:32:37.631Z",
      description: "A book about javascript",
      name: "Javascript book",
      price: 200,
      quantity: 10,
      shipping: false,
      slug: "Javascript-book",
      updatedAt: "2025-09-22T13:32:37.631Z",
      __v: 0,
      _id: "68d14ff5565d6bea2c888813",
    },
  ],
};

// Consumer component for testing
const TestComponent = () => {
  const [search, setSearch] = useSearch();

  return (
    <div>
      <div data-testid="keyword">{search.keyword}</div>
      <div data-testid="results">{search.results.length}</div>
      <button onClick={() => setSearch(MOCK_SEARCH_CONTEXT)}>Update</button>
    </div>
  );
};

describe("SearchContext", () => {
  it("should provide default empty values", () => {
    render(
      <SearchProvider>
        <TestComponent />
      </SearchProvider>
    );

    expect(screen.getByTestId("keyword")).toHaveTextContent("");
    expect(screen.getByTestId("results")).toHaveTextContent("0");
  });

  it("should update values when setSearch is called", () => {
    render(
      <SearchProvider>
        <TestComponent />
      </SearchProvider>
    );

    act(() => {
      screen.getByText("Update").click();
    });

    expect(screen.getByTestId("keyword")).toHaveTextContent(
      MOCK_SEARCH_CONTEXT.keyword
    );
    expect(screen.getByTestId("results")).toHaveTextContent(
      String(MOCK_SEARCH_CONTEXT.results.length)
    );
  });
});
