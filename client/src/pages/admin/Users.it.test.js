import React from "react";
import { render, waitFor, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import axios from "axios";
import Users from "./Users";
import { AuthProvider } from "../../context/auth";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import authRoutes from "../../../../routes/authRoute.js";

dotenv.config();

// Mock Layout and AdminMenu to avoid external dependencies
jest.mock("../../components/Layout", () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="layout-mock">{children}</div>,
}));

jest.mock("../../components/AdminMenu", () => () => (
  <div data-testid="admin-menu-mock">Admin Menu</div>
));

let server;
let app;
const TEST_PORT = 5003;

const ADMIN_USER = {
  name: "Admin User",
  email: `admin_${Date.now()}@example.com`,
  password: "AdminPass!234",
  phone: "1111111111",
  address: "Admin Street",
  answer: "admin answer",
};

const REGULAR_USER = {
  name: "Regular User",
  email: `regular_${Date.now()}@example.com`,
  password: "RegularPass!234",
  phone: "2222222222",
  address: "User Street",
  answer: "user answer",
};

describe("Users Integration", () => {
  beforeAll(async () => {
    const uri = process.env.MONGO_URL_TEST;
    await mongoose.connect(uri);
    await mongoose.connection.db.dropDatabase();

    app = express();
    app.use(cors());
    app.use(express.json());
    app.use("/api/v1/auth", authRoutes);

    server = app.listen(TEST_PORT);
    axios.defaults.baseURL = `http://localhost:${TEST_PORT}`;

    // Create admin user for authentication
    await axios.post("/api/v1/auth/register", ADMIN_USER);
    await mongoose.connection.db
      .collection("users")
      .updateOne({ email: ADMIN_USER.email }, { $set: { role: 1 } });

    // Create regular user to be listed
    await axios.post("/api/v1/auth/register", REGULAR_USER);
  });

  afterAll(async () => {
    if (server) server.close();
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(() => {
    localStorage.clear();
  });

  const renderUsersWithAuth = () => {
    return render(
      <MemoryRouter initialEntries={["/dashboard/admin/users"]}>
        <AuthProvider>
          <Users />
        </AuthProvider>
      </MemoryRouter>
    );
  };

  it("does not fetch users when no auth token", () => {
    renderUsersWithAuth();

    // Should not show loading and table
    expect(screen.queryByText("Loading users...")).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("loads and displays users list for authenticated admin", async () => {
    // Login as admin first
    const loginRes = await axios.post("/api/v1/auth/login", {
      email: ADMIN_USER.email,
      password: ADMIN_USER.password,
    });

    // Set auth data in localStorage
    localStorage.setItem("auth", JSON.stringify(loginRes.data));

    renderUsersWithAuth();

    // wait 1 second
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Wait for users to load
    await waitFor(() => {
      expect(screen.getByText("All Users")).toBeInTheDocument();
    });

    // Check that users are displayed in table
    expect(screen.getByText(ADMIN_USER.name)).toBeInTheDocument();
    expect(screen.getByText(ADMIN_USER.email)).toBeInTheDocument();
    expect(screen.getByText(REGULAR_USER.name)).toBeInTheDocument();
    expect(screen.getByText(REGULAR_USER.email)).toBeInTheDocument();

    // Check role display
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByText("User")).toBeInTheDocument();
  });
});
