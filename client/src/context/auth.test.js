import React from "react";
import { render, act } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import axios from "axios";
import { AuthProvider, useAuth } from "./auth";

// Mock axios
jest.mock("axios");

const MOCK_AUTH_DATA = {
  user: { id: 1, name: "John Doe", email: "john@example.com", role: "user" },
  token: "mock-token-123",
};

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
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(MOCK_AUTH_DATA));

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith("auth");
      expect(getByTestId("user-name")).toHaveTextContent(
        MOCK_AUTH_DATA.user.name
      );
      expect(getByTestId("user-email")).toHaveTextContent(
        MOCK_AUTH_DATA.user.email
      );
      expect(getByTestId("token")).toHaveTextContent(MOCK_AUTH_DATA.token);
    });

    it("should set axios authorization header when token is present", () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(MOCK_AUTH_DATA));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(axios.defaults.headers.common["Authorization"]).toBe(
        MOCK_AUTH_DATA.token
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
        authContext.setAuth(MOCK_AUTH_DATA);
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
        MOCK_AUTH_DATA.token
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
        authContext.setAuth(MOCK_AUTH_DATA);
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

      expect(getByTestId("user-name")).toHaveTextContent(
        MOCK_AUTH_DATA.user.name
      );
      expect(getByTestId("user-email")).toHaveTextContent(
        MOCK_AUTH_DATA.user.email
      );
      expect(getByTestId("token")).toHaveTextContent(MOCK_AUTH_DATA.token);
    });
  });

  describe("localStorage integration", () => {
    it("should parse localStorage data correctly", () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(MOCK_AUTH_DATA));

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith("auth");
      expect(getByTestId("user-name")).toHaveTextContent(
        MOCK_AUTH_DATA.user.name
      );
      expect(getByTestId("user-email")).toHaveTextContent(
        MOCK_AUTH_DATA.user.email
      );
      expect(getByTestId("token")).toHaveTextContent(MOCK_AUTH_DATA.token);
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
