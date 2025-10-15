import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom";
import axios from "axios";
import PrivateRoute from "./Private";
import { AuthProvider } from "../../context/auth";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import authRoutes from "../../../../routes/authRoute.js";

dotenv.config();

let server;
let app;
const TEST_PORT = 5005;

const TEST_USER = {
  name: "Private Test User",
  email: `private_${Date.now()}@example.com`,
  password: "PrivatePass!234",
  phone: "9999999999",
  address: "9 Private St",
  answer: "baseball",
};

const Protected = () => <div data-testid="protected">Protected Content</div>;

describe("PrivateRoute Integration", () => {
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

  const renderWithRoutes = () => {
    return render(
      <MemoryRouter initialEntries={["/protected"]}>
        <AuthProvider>
          <Routes>
            <Route path="/protected" element={<PrivateRoute />}>
              <Route index element={<Protected />} />
            </Route>
            <Route path="/login" element={<div>Login Page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );
  };

  it("shows spinner when not authenticated", () => {
    renderWithRoutes();

    // Spinner shows a heading and a status element
    expect(screen.getByText(/redirecting to you in/i)).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByTestId("protected")).not.toBeInTheDocument();
  });

  it("renders protected content when authenticated", async () => {
    const loginRes = await axios.post("/api/v1/auth/login", {
      email: TEST_USER.email,
      password: TEST_USER.password,
    });

    localStorage.setItem("auth", JSON.stringify(loginRes.data));

    renderWithRoutes();

    // Spinner may flash initially, then protected content appears
    expect(await screen.findByTestId("protected")).toBeInTheDocument();
  });
});
