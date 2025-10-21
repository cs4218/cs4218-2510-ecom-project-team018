import React from "react";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import axios from "axios";
import Register from "./Register";
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

// Simplify Layout and avoid unrelated dependencies
jest.mock("../../components/Layout", () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="layout-mock">{children}</div>,
}));

// Avoid Header-side effects if included anywhere
jest.mock("../../context/cart", () => ({
  useCart: jest.fn(() => [[], jest.fn()]),
}));
jest.mock("../../hooks/useCategory", () => jest.fn(() => []));
jest.mock("../../components/Form/SearchInput", () => () => (
  <div data-testid="search-input-mock" />
));

let server;
let app;
const TEST_PORT = 5002;

const NEW_USER = {
  name: "Reg Test User",
  email: `reg_test_${Date.now()}@example.com`,
  password: "TestPass!234",
  phone: "1234567890",
  address: "1 Integration Drive",
  DOB: "2000-01-01",
  answer: "football",
};

describe("Register Integration", () => {
  beforeAll(async () => {
    await connectTestDB();

    app = express();
    app.use(cors());
    app.use(express.json());
    app.use("/api/v1/auth", authRoutes);

    server = app.listen(TEST_PORT);
    axios.defaults.baseURL = `http://localhost:${TEST_PORT}`;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await clearDB();
    await disconnectTestDB();
  });

  const renderRegister = () => {
    return render(
      <MemoryRouter initialEntries={["/register"]}>
        <Register />
      </MemoryRouter>
    );
  };

  it("registers a new user successfully and can login afterwards", async () => {
    const axiosPostSpy = jest.spyOn(axios, "post");
    renderRegister();

    fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), {
      target: { value: NEW_USER.name },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
      target: { value: NEW_USER.email },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
      target: { value: NEW_USER.password },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Your Phone"), {
      target: { value: NEW_USER.phone },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Your Address"), {
      target: { value: NEW_USER.address },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Your DOB"), {
      target: { value: NEW_USER.DOB },
    });
    fireEvent.change(
      screen.getByPlaceholderText("What is Your Favorite sports"),
      { target: { value: NEW_USER.answer } }
    );

    fireEvent.click(screen.getByText("REGISTER"));

    // Ensure register endpoint was called
    await waitFor(() => {
      expect(axiosPostSpy).toHaveBeenCalledWith(
        "/api/v1/auth/register",
        expect.objectContaining({
          name: NEW_USER.name,
          email: NEW_USER.email,
          password: NEW_USER.password,
          phone: NEW_USER.phone,
          address: NEW_USER.address,
          DOB: NEW_USER.DOB,
          answer: NEW_USER.answer,
        })
      );
    });

    // Wait 1 second for Mongo to catch up
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Now verify by logging in against backend (wait until available)
    let res;
    await waitFor(async () => {
      res = await axios.post("/api/v1/auth/login", {
        email: NEW_USER.email,
        password: NEW_USER.password,
      });
      expect(res.status).toBe(200);
    });
    expect(res.data.success).toBe(true);
    expect(res.data.user.email).toBe(NEW_USER.email);
    expect(res.data.token).toBeTruthy();
  });

  it("handles duplicate registrations (same email)", async () => {
    const user = {
      name: "Dup User",
      email: "dup@example.com",
      password: "DupPass!234",
      phone: "1111111111",
      address: "2 Integration Way",
      DOB: "1999-12-31",
      answer: "basketball",
    };

    // First registration succeeds
    const axiosPostSpy = jest.spyOn(axios, "post");
    renderRegister();
    fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), {
      target: { value: user.name },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
      target: { value: user.email },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
      target: { value: user.password },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Your Phone"), {
      target: { value: user.phone },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Your Address"), {
      target: { value: user.address },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Your DOB"), {
      target: { value: user.DOB },
    });
    fireEvent.change(
      screen.getByPlaceholderText("What is Your Favorite sports"),
      { target: { value: user.answer } }
    );
    fireEvent.click(screen.getByText("REGISTER"));

    // Wait for first register call
    await waitFor(() => {
      expect(axiosPostSpy).toHaveBeenCalledWith(
        "/api/v1/auth/register",
        expect.objectContaining({ email: user.email })
      );
    });

    // Register again with same email
    fireEvent.click(screen.getByText("REGISTER"));

    // Wait until the second call is observed
    await waitFor(() => {
      expect(
        axiosPostSpy.mock.calls.filter((c) => c[0] === "/api/v1/auth/register")
      ).toHaveLength(2);
    });

    // Wait 1 second for Mongo to catch up
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Backend should already have user; logging in still works once
    const res = await axios.post("/api/v1/auth/login", {
      email: user.email,
      password: user.password,
    });
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.user.email).toBe(user.email);
    expect(res.data.token).toBeTruthy();
  });

  it("rejects missing fields", async () => {
    renderRegister();

    // Only supply email to trigger backend validation failure
    fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
      target: { value: "incomplete@example.com" },
    });

    fireEvent.click(screen.getByText("REGISTER"));

    // Attempting to login should fail because user wasn't created
    await expect(
      axios.post("/api/v1/auth/login", {
        email: "incomplete@example.com",
        password: "whatever",
      })
    ).rejects.toBeTruthy();
  });

  it("rejects invalid email format", async () => {
    const user = {
      name: "Bad Email User",
      email: "notanemail",
      password: "ValidPass!234",
      phone: "4444444444",
      address: "5 Integration Way",
      DOB: "1992-03-03",
      answer: "tennis",
    };

    renderRegister();
    fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), {
      target: { value: user.name },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
      target: { value: user.email },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
      target: { value: user.password },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Your Phone"), {
      target: { value: user.phone },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Your Address"), {
      target: { value: user.address },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Your DOB"), {
      target: { value: user.DOB },
    });
    fireEvent.change(
      screen.getByPlaceholderText("What is Your Favorite sports"),
      { target: { value: user.answer } }
    );
    fireEvent.click(screen.getByText("REGISTER"));

    await expect(
      axios.post("/api/v1/auth/login", {
        email: user.email,
        password: user.password,
      })
    ).rejects.toBeTruthy();
  });

  it("rejects 73-character password", async () => {
    const user = {
      name: "Long Pass User",
      email: `longpass_${Date.now()}@example.com`,
      password: "a".repeat(73),
      phone: "2222222222",
      address: "3 Integration Way",
      DOB: "1990-01-01",
      answer: "soccer",
    };

    renderRegister();
    fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), {
      target: { value: user.name },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
      target: { value: user.email },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
      target: { value: user.password },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Your Phone"), {
      target: { value: user.phone },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Your Address"), {
      target: { value: user.address },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Your DOB"), {
      target: { value: user.DOB },
    });
    fireEvent.change(
      screen.getByPlaceholderText("What is Your Favorite sports"),
      { target: { value: user.answer } }
    );
    fireEvent.click(screen.getByText("REGISTER"));

    // Attempt to login should fail if registration was rejected
    await expect(
      axios.post("/api/v1/auth/login", {
        email: user.email,
        password: user.password,
      })
    ).rejects.toBeTruthy();
  });
});
