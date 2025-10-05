import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Users from "./Users";
import axios from "axios";
import toast from "react-hot-toast";

/* mocks */
jest.mock("axios");
jest.mock("react-hot-toast", () => ({
  error: jest.fn(),
}));

const mockUseAuth = jest.fn();
jest.mock("../../context/auth", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("moment", () => {
  const mockMoment = jest.fn((input) => ({
    format: (pattern) => `formatted-${input}-${pattern}`,
  }));
  mockMoment.default = mockMoment;
  return mockMoment;
});

// mock components
jest.mock("../../components/Layout", () => (props) => (
  <div data-testid="Layout">{props.children}</div>
));

jest.mock("../../components/AdminMenu", () => () => (
  <div data-testid="AdminMenu" />
));

const USERS_API = "/api/v1/auth/users";

const SAMPLE_USERS = [
  {
    _id: "u1",
    name: "Alice",
    email: "alice@example.com",
    phone: "1234567890",
    address: "123 Main St",
    role: 0,
    createdAt: "2024-01-01T00:00:00.000Z",
  },
  {
    _id: "u2",
    name: "Bob",
    email: "bob@example.com",
    phone: "9876543210",
    address: "456 Oak Ave",
    role: 1,
    createdAt: "2024-01-10T12:30:00.000Z",
  },
];

const renderUsersPage = () => {
  return render(
    <MemoryRouter>
      <Users />
    </MemoryRouter>
  );
};

describe("admin's Users page", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAuth.mockReturnValue([{ token: "test-token" }]);
    axios.get.mockResolvedValue({
      data: {
        success: true,
        users: SAMPLE_USERS,
      },
    });
  });

  test("renders a list of users when the API succeeds", async () => {
    renderUsersPage();

    await waitFor(() => expect(axios.get).toHaveBeenCalledWith(USERS_API));

    // components
    expect(await screen.getByTestId("Layout")).toBeInTheDocument();
    expect(screen.getByTestId("AdminMenu")).toBeInTheDocument();

    // heading
    expect(
      screen.getByRole("heading", { name: /all users/i })
    ).toBeInTheDocument();

    for (const user of SAMPLE_USERS) {
      expect(await screen.findByText(user.name)).toBeInTheDocument();
      expect(screen.getByText(user.email)).toBeInTheDocument();
      expect(screen.getByText(user.phone)).toBeInTheDocument();
      expect(screen.getByText(user.address)).toBeInTheDocument();
      const roleLabel = user.role === 1 ? "Admin" : "User";
      expect(screen.getByText(roleLabel)).toBeInTheDocument();
      expect(
        screen.getByText(`formatted-${user.createdAt}-LLL`)
      ).toBeInTheDocument();
    }
  });
});
