import React from "react";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import axios from "axios";
import Login from "./Login";
import { AuthProvider } from "../../context/auth";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "../../../../routes/authRoute.js";
import {
  clearDB,
  connectTestDB,
  disconnectTestDB,
} from "../../../../tests/mongoTestEnv.js";

dotenv.config();

jest.mock("../../components/Layout", () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="layout-mock">{children}</div>,
}));

jest.mock("../../context/cart", () => ({
  useCart: jest.fn(() => [[], jest.fn()]),
}));
jest.mock("../../hooks/useCategory", () => jest.fn(() => []));
jest.mock("../../components/Form/SearchInput", () => () => (
  <div data-testid="search-input-mock" />
));

let server;
let app;
const TEST_PORT = 5001;

const TEST_USER = {
  name: "Integration Test User",
  email: "integration@test.com",
  password: "testPassword123",
  phone: "1234567890",
  address: "123 Test Street",
  answer: "test answer",
};

describe("Login Integration", () => {
  beforeAll(async () => {
    await connectTestDB();

    app = express();
    app.use(cors());
    app.use(express.json());
    app.use("/api/v1/auth", authRoutes);

    server = app.listen(TEST_PORT);
    axios.defaults.baseURL = `http://localhost:${TEST_PORT}`;

    await axios.post("/api/v1/auth/register", TEST_USER);
  });

  afterAll(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await clearDB();
    await disconnectTestDB();
  });

  beforeEach(() => {
    localStorage.clear();
  });

  const renderWithProviders = (ui) => {
    return render(
      <MemoryRouter initialEntries={["/login"]}>
        <AuthProvider>{ui}</AuthProvider>
      </MemoryRouter>
    );
  };

  it("logs in with valid credentials and updates storage and context", async () => {
    renderWithProviders(<Login />);

    fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
      target: { value: TEST_USER.email },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
      target: { value: TEST_USER.password },
    });
    fireEvent.click(screen.getByText("LOGIN"));

    await waitFor(() => {
      const authStr = localStorage.getItem("auth");
      expect(authStr).toBeTruthy();
    });

    const auth = JSON.parse(localStorage.getItem("auth"));
    expect(auth.success).toBe(true);
    expect(auth.user.email).toBe(TEST_USER.email);
    expect(auth.token).toBeTruthy();
    expect(axios.defaults.headers.common["Authorization"]).toBeTruthy();
    const res = await axios.get("/api/v1/auth/user-auth", {
      headers: { Authorization: auth.token },
    });
    expect(res.data.ok).toBe(true);
  });

  it("rejects invalid password", async () => {
    renderWithProviders(<Login />);

    fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
      target: { value: TEST_USER.email },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
      target: { value: "wrongpassword" },
    });
    fireEvent.click(screen.getByText("LOGIN"));

    await waitFor(() => {
      expect(localStorage.getItem("auth")).toBeFalsy();
    });
  });

  it("rejects missing fields", async () => {
    renderWithProviders(<Login />);

    // Do not fill fields; directly submit
    fireEvent.click(screen.getByText("LOGIN"));

    await waitFor(() => {
      expect(localStorage.getItem("auth")).toBeFalsy();
    });
  });

  it("rejects non-existent user", async () => {
    renderWithProviders(<Login />);

    fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
      target: { value: "unknown.user@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
      target: { value: "somePassword!" },
    });
    fireEvent.click(screen.getByText("LOGIN"));

    await waitFor(() => {
      expect(localStorage.getItem("auth")).toBeFalsy();
    });
  });
});
