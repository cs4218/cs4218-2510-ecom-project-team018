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

  test("all admin properties correct", () => {
    // this test ensures that admin details are rendered correctly
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );

    expect(screen.getByText(/Admin Name/i)).toHaveTextContent("Mock Admin");
    expect(screen.getByText(/Admin Email/i)).toHaveTextContent(
      "mockadmin@example.com"
    );
    expect(screen.getByText(/Admin Contact/i)).toHaveTextContent("12345");
  });

  test("no admin properties", () => {
    // this test ensures that the labels are still shown when there's no admin user data
    // mock no admin user data
    useAuth.mockReturnValue([
      {
        user: null,
        token: "",
      },
      jest.fn(),
    ]);

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );

    // expected to see labels but without data
    expect(screen.getByText(/Admin Name/i)).toHaveTextContent("Admin Name :");
    expect(screen.getByText(/Admin Email/i)).toHaveTextContent("Admin Email :");
    expect(screen.getByText(/Admin Contact/i)).toHaveTextContent(
      "Admin Contact :"
    );
  });
});
