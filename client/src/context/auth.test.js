import React from "react";
import { render, act } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import axios from "axios";
import { AuthProvider, useAuth } from "./auth";

// Mock axios
jest.mock("axios");

// Test component to access the auth context
// Ref: https://stackoverflow.com/questions/56828017/testing-usecontext-with-react-testing-library
const TestComponent = ({ onAuthChange }) => {
  const [auth, setAuth] = useAuth();

  React.useEffect(() => {
    if (onAuthChange) {
      onAuthChange({ auth, setAuth });
    }
  }, [auth, setAuth, onAuthChange]);

  return (
    <div>
      <div data-testid="user-name">{auth?.user?.name || "No user"}</div>
      <div data-testid="user-email">{auth?.user?.email || "No email"}</div>
      <div data-testid="token">{auth?.token || "No token"}</div>
    </div>
  );
};

describe("Auth Context", () => {
  let mockLocalStorage;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock localStorage
    mockLocalStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    };
    Object.defineProperty(window, "localStorage", {
      value: mockLocalStorage,
      writable: true,
    });

    // Reset axios defaults
    axios.defaults.headers.common = {};
  });

  describe("AuthProvider", () => {
    it("should initialize with default auth state", () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(getByTestId("user-name")).toHaveTextContent("No user");
      expect(getByTestId("user-email")).toHaveTextContent("No email");
      expect(getByTestId("token")).toHaveTextContent("No token");
    });

    it("should load auth data from localStorage on initialization", () => {
      const mockAuthData = {
        user: { id: 1, name: "John Doe", email: "john@example.com" },
        token: "mock-token-123",
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockAuthData));

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith("auth");
      expect(getByTestId("user-name")).toHaveTextContent("John Doe");
      expect(getByTestId("user-email")).toHaveTextContent("john@example.com");
      expect(getByTestId("token")).toHaveTextContent("mock-token-123");
    });

    it("should set axios authorization header when token is present", () => {
      const mockAuthData = {
        user: { id: 1, name: "John Doe", email: "john@example.com" },
        token: "mock-token-123",
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockAuthData));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(axios.defaults.headers.common["Authorization"]).toBe(
        "mock-token-123"
      );
    });

    it("should update axios authorization header when auth state changes", () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      let authContext;

      const { rerender } = render(
        <AuthProvider>
          <TestComponent
            onAuthChange={(ctx) => {
              authContext = ctx;
            }}
          />
        </AuthProvider>
      );

      // Initially no token
      expect(axios.defaults.headers.common["Authorization"]).toBe("");

      // Update auth state
      act(() => {
        authContext.setAuth({
          user: { id: 1, name: "Jane Doe", email: "jane@example.com" },
          token: "new-token-456",
        });
      });

      rerender(
        <AuthProvider>
          <TestComponent
            onAuthChange={(ctx) => {
              authContext = ctx;
            }}
          />
        </AuthProvider>
      );

      expect(axios.defaults.headers.common["Authorization"]).toBe(
        "new-token-456"
      );
    });
  });

  describe("useAuth hook", () => {
    it("should provide auth state and setAuth function", () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      let authContext;

      render(
        <AuthProvider>
          <TestComponent
            onAuthChange={(ctx) => {
              authContext = ctx;
            }}
          />
        </AuthProvider>
      );

      expect(authContext.auth).toEqual({
        user: null,
        token: "",
      });
    });

    it("should update auth state when setAuth is called", () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      let authContext;

      const { getByTestId, rerender } = render(
        <AuthProvider>
          <TestComponent
            onAuthChange={(ctx) => {
              authContext = ctx;
            }}
          />
        </AuthProvider>
      );

      // Initial state
      expect(getByTestId("user-name")).toHaveTextContent("No user");
      expect(getByTestId("token")).toHaveTextContent("No token");

      // Update auth state
      act(() => {
        authContext.setAuth({
          user: { id: 1, name: "Test User", email: "test@example.com" },
          token: "test-token",
        });
      });

      rerender(
        <AuthProvider>
          <TestComponent
            onAuthChange={(ctx) => {
              authContext = ctx;
            }}
          />
        </AuthProvider>
      );

      expect(getByTestId("user-name")).toHaveTextContent("Test User");
      expect(getByTestId("user-email")).toHaveTextContent("test@example.com");
      expect(getByTestId("token")).toHaveTextContent("test-token");
    });
  });

  describe("localStorage integration", () => {
    it("should parse localStorage data correctly", () => {
      const mockAuthData = {
        user: {
          id: 2,
          name: "Alice Smith",
          email: "alice@example.com",
          role: "user",
        },
        token: "alice-token-789",
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockAuthData));

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith("auth");
      expect(getByTestId("user-name")).toHaveTextContent("Alice Smith");
      expect(getByTestId("user-email")).toHaveTextContent("alice@example.com");
      expect(getByTestId("token")).toHaveTextContent("alice-token-789");
    });

    it("should handle empty localStorage", () => {
      mockLocalStorage.getItem.mockReturnValue("");

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(getByTestId("user-name")).toHaveTextContent("No user");
      expect(getByTestId("token")).toHaveTextContent("No token");
    });

    it("should handle null localStorage", () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(getByTestId("user-name")).toHaveTextContent("No user");
      expect(getByTestId("token")).toHaveTextContent("No token");
    });
  });
});
