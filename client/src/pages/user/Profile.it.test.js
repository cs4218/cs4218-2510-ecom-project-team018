import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Profile from "./Profile";
import User from "../../../../models/userModel.js";
import authRoutes from "../../../../routes/authRoute.js";
import { AuthProvider } from "../../context/auth";
import { MemoryRouter } from "react-router-dom";
import toast from "react-hot-toast";

import {
    clearDB, connectTestDB, disconnectTestDB
} from "../../../../tests/mongoTestEnv.js";

dotenv.config();

// Mock Layout to avoid external dependencies
jest.mock("../../components/Layout", () => ({
    __esModule: true,
    default: ({ children }) => <div data-testid="layout-mock">{children}</div>,
}));

jest.mock("react-hot-toast");

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
    ...jest.requireActual("react-router-dom"),
    useNavigate: () => mockNavigate,
}));

let server;
let app;
const TEST_PORT = 5001;

const setUpAuth = async () => {
  await axios.post("/api/v1/auth/register", {
    name: "Test User",
    email: "test@example.com",
    password: "Password123!",
    phone: "1234567890",
    address: "123 Test St",
    answer: "blue"
  });

  const loginRes = await axios.post("/api/v1/auth/login", {
    email: "test@example.com",
    password: "Password123!",
  });

  localStorage.setItem("auth", JSON.stringify(loginRes.data));

  return loginRes.data.user;
};