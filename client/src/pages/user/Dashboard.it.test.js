import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import axios from "axios";
import Dashboard from "./Dashboard";
import { AuthProvider } from "../../context/auth";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import authRoutes from "../../../../routes/authRoute.js";

dotenv.config();

// Mock Layout and UserMenu to avoid unrelated dependencies
jest.mock("../../components/Layout", () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="layout-mock">{children}</div>,
}));

jest.mock("../../components/UserMenu", () => () => (
  <div data-testid="user-menu-mock">User Menu</div>
));

let server;
let app;
const TEST_PORT = 5004;

const TEST_USER = {
  name: "Dash Test User",
  email: `dash_${Date.now()}@example.com`,
  password: "DashPass!234",
  phone: "1234567890",
  address: "123 Dash Street",
  answer: "blue",
};

describe("Dashboard Integration", () => {
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

    // Register user
    await axios.post("/api/v1/auth/register", TEST_USER);
  });

  afterAll(async () => {
    if (server) server.close();
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(() => {
    localStorage.clear();
  });

  const renderDashboard = () => {
    return render(
      <MemoryRouter initialEntries={["/dashboard/user"]}>
        <AuthProvider>
          <Dashboard />
        </AuthProvider>
      </MemoryRouter>
    );
  };

  it("renders fallback when user not present", async () => {
    // No auth in storage
    renderDashboard();

    // Should show fallback
    expect(await screen.findByText("User Data Not Found")).toBeInTheDocument();
  });

  it("renders user details when authenticated", async () => {
    // Login to get token and user
    const loginRes = await axios.post("/api/v1/auth/login", {
      email: TEST_USER.email,
      password: TEST_USER.password,
    });

    // Persist auth for provider to consume
    localStorage.setItem("auth", JSON.stringify(loginRes.data));

    renderDashboard();

    // Assert user info appears
    expect(
      await screen.findByText(`user: ${TEST_USER.name}`)
    ).toBeInTheDocument();
    expect(
      await screen.findByText(`email: ${TEST_USER.email}`)
    ).toBeInTheDocument();
    expect(
      await screen.findByText(`address: ${TEST_USER.address}`)
    ).toBeInTheDocument();
    expect(screen.getByTestId("user-menu-mock")).toBeInTheDocument();
  });
});
