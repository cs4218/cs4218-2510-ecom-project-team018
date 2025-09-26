import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import PrivateRoute from "./Private";
import { useAuth } from "../../context/auth";

// Mocks
jest.mock("axios");
jest.mock("../../context/auth");
jest.mock("../Spinner", () => ({ path }) => (
  <div data-testid="spinner-mock">Redirecting to {path || "login"}</div>
));

const mockedAxios = axios;
const mockedUseAuth = useAuth;

// Test component to wrap PrivateRoute
const TestComponent = () => (
  <div data-testid="protected-content">Protected Content</div>
);

const renderPrivateRoute = () => {
  return render(
    <MemoryRouter initialEntries={["/protected"]}>
      <Routes>
        <Route path="/protected" element={<PrivateRoute />}>
          <Route index element={<TestComponent />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
};

describe("PrivateRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  it("should render protected content when user is authenticated", async () => {
    mockedUseAuth.mockReturnValue([{ token: "valid-token" }]);
    mockedAxios.get.mockResolvedValue({ data: { ok: true } });

    renderPrivateRoute();

    // Initially shows spinner
    expect(screen.getByTestId("spinner-mock")).toBeInTheDocument();

    // Wait for auth check to complete and protected content to show
    await waitFor(() => {
      expect(screen.getByTestId("protected-content")).toBeInTheDocument();
    });

    expect(mockedAxios.get).toHaveBeenCalledWith("/api/v1/auth/user-auth", {
      headers: { Authorization: "valid-token" },
    });
  });

  it("should show spinner when user is not authenticated", async () => {
    mockedUseAuth.mockReturnValue([{ token: "invalid-token" }]);
    mockedAxios.get.mockResolvedValue({ data: { ok: false } });

    renderPrivateRoute();

    expect(screen.getByTestId("spinner-mock")).toBeInTheDocument();

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith("/api/v1/auth/user-auth", {
        headers: { Authorization: "invalid-token" },
      });
    });

    // Should still show spinner, not protected content
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    expect(screen.getByTestId("spinner-mock")).toBeInTheDocument();
  });

  it("should handle axios request errors", async () => {
    mockedUseAuth.mockReturnValue([{ token: "valid-token" }]);
    const error = new Error("Network error");
    mockedAxios.get.mockRejectedValue(error);

    renderPrivateRoute();

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith("/api/v1/auth/user-auth", {
        headers: { Authorization: "valid-token" },
      });
    });

    expect(console.log).toHaveBeenCalledWith(error);
    expect(screen.getByTestId("spinner-mock")).toBeInTheDocument();
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
  });

  it("should handle empty string token", () => {
    mockedUseAuth.mockReturnValue([{ token: "" }]);

    renderPrivateRoute();

    expect(screen.getByTestId("spinner-mock")).toBeInTheDocument();
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  it("should re-check auth when token changes", async () => {
    const { rerender } = render(
      <MemoryRouter initialEntries={["/protected"]}>
        <Routes>
          <Route path="/protected" element={<PrivateRoute />}>
            <Route index element={<TestComponent />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    // First render with no token
    mockedUseAuth.mockReturnValue([{ token: null }]);
    rerender(
      <MemoryRouter initialEntries={["/protected"]}>
        <Routes>
          <Route path="/protected" element={<PrivateRoute />}>
            <Route index element={<TestComponent />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(mockedAxios.get).not.toHaveBeenCalled();

    // Second render with valid token
    mockedUseAuth.mockReturnValue([{ token: "new-token" }]);
    mockedAxios.get.mockResolvedValue({ data: { ok: true } });

    rerender(
      <MemoryRouter initialEntries={["/protected"]}>
        <Routes>
          <Route path="/protected" element={<PrivateRoute />}>
            <Route index element={<TestComponent />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith("/api/v1/auth/user-auth", {
        headers: { Authorization: "new-token" },
      });
    });
  });
});
