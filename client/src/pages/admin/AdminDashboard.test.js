import React from "react";
import { useAuth } from "../../context/auth";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import AdminDashboard from "./AdminDashboard";

// mock useAuth
jest.mock("../../context/auth");
// mock layout
jest.mock("../../components/Layout", () => ({ children }) => (
  <div>{children}</div>
));

describe("Admin Dashboard", () => {
  beforeEach(() => {
    // mock a successful auth context
    useAuth.mockReturnValue([
      {
        user: {
          name: "Mock Admin",
          email: "mockadmin@example.com",
          phone: "12345",
        },
        token: "mock-token",
      },
      jest.fn(), // mock setAuth
    ]);
  });
});
