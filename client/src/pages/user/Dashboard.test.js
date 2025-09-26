import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import Dashboard from "./Dashboard";
import { useAuth } from "../../context/auth";

jest.mock("../../context/auth");
jest.mock("../../components/Layout", () => ({ title, children }) => (
  <div data-testid="layout-mock" title={title}>
    {children}
  </div>
));
jest.mock("../../components/UserMenu", () => () => (
  <div data-testid="user-menu-mock">User Menu</div>
));

const mockedUseAuth = useAuth;

const renderDashboard = () => {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );
};

describe("Dashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render user data when user exists", () => {
    const MOCK_USER = {
      name: "John Doe",
      email: "john@example.com",
      address: "123 Main St",
    };
    mockedUseAuth.mockReturnValue([{ user: MOCK_USER }]);

    renderDashboard();

    expect(screen.getByTestId("layout-mock")).toBeInTheDocument();
    expect(screen.getByTestId("layout-mock")).toHaveAttribute(
      "title",
      "Dashboard - Ecommerce App"
    );
    expect(screen.getByTestId("user-menu-mock")).toBeInTheDocument();
    expect(screen.getByText("user: John Doe")).toBeInTheDocument();
    expect(screen.getByText("email: john@example.com")).toBeInTheDocument();
    expect(screen.getByText("address: 123 Main St")).toBeInTheDocument();
    expect(screen.queryByText("User Data Not Found")).not.toBeInTheDocument();
  });

  it("should show fallback text when user properties are missing", () => {
    const EMPTY_DATA_MOCK_USER = {
      name: null,
      email: "",
      address: undefined,
    };
    mockedUseAuth.mockReturnValue([{ user: EMPTY_DATA_MOCK_USER }]);

    renderDashboard();

    expect(screen.getByText("user: Name Not Found")).toBeInTheDocument();
    expect(screen.getByText("email: Email Not Found")).toBeInTheDocument();
    expect(screen.getByText("address: Address Not Found")).toBeInTheDocument();
    expect(screen.queryByText("User Data Not Found")).not.toBeInTheDocument();
  });
});
