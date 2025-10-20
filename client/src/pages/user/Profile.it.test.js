import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

const DEFAULT_USER = {
  name: "Test User",
  email: "test@example.com",
  password: "Password123!",
  phone: "1234567890",
  address: "123 Test St",
  answer: "blue",
};

const NEW = {
    name: "New Name",
    phone: "9999999999",
    address: "New Address",
    password: "NewPass123!",
};

const setUpAuth = async () => {
  await axios.post("/api/v1/auth/register", DEFAULT_USER);

  const loginRes = await axios.post("/api/v1/auth/login", {
    email: DEFAULT_USER.email,
    password: DEFAULT_USER.password,
  });

  localStorage.setItem("auth", JSON.stringify(loginRes.data));

  return loginRes.data.user;
};

const renderPage = () => {
    return render(
        <MemoryRouter initialEntries={["/dashboard/user/profile"]}>
            <AuthProvider>
                <Profile />
            </AuthProvider>
        </MemoryRouter>
    );
};

describe("Profile Page Integration Tests", () => {
  beforeAll(async () => {
    await connectTestDB();

    app = express();
    app.use(cors());
    app.use(express.json());
    app.use("/api/v1/auth", authRoutes);
    server = app.listen(TEST_PORT);
    axios.defaults.baseURL = `http://localhost:${TEST_PORT}`;
  })

  beforeEach(async () => {
    await clearDB();
    localStorage.clear();
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await disconnectTestDB();
  })

  it("loads profile and pre-fills form when authenticated; email is disabled", async () => {
    await setUpAuth();
    renderPage();

    let nameInput, emailInput, phoneInput, addressInput;

    // Name input
    await waitFor(() => {
        nameInput = screen.getByPlaceholderText(/enter your name/i);
        expect(nameInput).toBeInTheDocument();
    });

    // Email input (disabled)
    await waitFor(() => {
        emailInput = screen.getByPlaceholderText(/enter your email/i);
        expect(emailInput).toBeInTheDocument();
    });

    // Phone input
    await waitFor(() => {
        phoneInput = screen.getByPlaceholderText(/enter your phone/i);
        expect(phoneInput).toBeInTheDocument();
    });

    // Address input
    await waitFor(() => {
        addressInput = screen.getByPlaceholderText(/enter your address/i);
        expect(addressInput).toBeInTheDocument();
    });


    expect(nameInput).toHaveValue(DEFAULT_USER.name);
    expect(emailInput).toHaveValue(DEFAULT_USER.email);
    expect(phoneInput).toHaveValue(DEFAULT_USER.phone);
    expect(addressInput).toHaveValue(DEFAULT_USER.address);

    // Email must be disabled
    expect(emailInput).toBeDisabled();
  });

  it("shows toast error if no auth token is present", async () => {
    renderPage();

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Unable to retrieve profile, please sign out and sign in again."
      );
    });

    // Form should not be prefilled
    const nameInput = screen.getByPlaceholderText("Enter Your Name");
    expect(nameInput).toHaveValue("");
  });

  it("validates that password < 6 does not submit and shows toast", async () => {
    await setUpAuth();
    renderPage();

    // Spy on axios.put to ensure it's NOT called
    const putSpy = jest.spyOn(axios, "put");

    const passwordInput = await screen.findByPlaceholderText(
      "Enter Your Password"
    );
    const updateBtn = screen.getByRole("button", { name: /update/i });

    await userEvent.clear(passwordInput);
    await userEvent.type(passwordInput, "123"); // too short

    await userEvent.click(updateBtn);

    expect(toast.error).toHaveBeenCalledWith(
      "Password must be at least 6 characters long"
    );
    expect(putSpy).not.toHaveBeenCalled();
  });

  it("successfully updates profile and syncs context + localStorage + DB", async () => {
    await setUpAuth();
    renderPage();

    const nameInput = await screen.findByPlaceholderText("Enter Your Name");
    const phoneInput = screen.getByPlaceholderText("Enter Your Phone");
    const addressInput = screen.getByPlaceholderText("Enter Your Address");
    const passwordInput = screen.getByPlaceholderText("Enter Your Password");
    const updateBtn = screen.getByRole("button", { name: /update/i });

    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, NEW.name);

    await userEvent.clear(phoneInput);
    await userEvent.type(phoneInput, NEW.phone);

    await userEvent.clear(addressInput);
    await userEvent.type(addressInput, NEW.address);

    await userEvent.clear(passwordInput);
    await userEvent.type(passwordInput, NEW.password);

    await userEvent.click(updateBtn);

    // Success toast
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Profile Updated Successfully"
      );
    });

    // LocalStorage should be updated with updatedUser (name/phone/address)
    const ls = JSON.parse(localStorage.getItem("auth"));
    expect(ls).toBeTruthy();
    expect(ls.user).toMatchObject({
      name: NEW.name,
      phone: NEW.phone,
      address: NEW.address,
    });

    // DB should be updated as well
    const dbUser = await User.findOne({ email: DEFAULT_USER.email });
    expect(dbUser.name).toBe(NEW.name);
    expect(dbUser.phone).toBe(NEW.phone);
    expect(dbUser.address).toBe(NEW.address);
  });

  it("shows error toast when backend returns success but missing updatedUser", async () => {
    await setUpAuth();
    renderPage();

    // Mock axios.put ONCE to simulate backend returning success without updatedUser
    const putMock = jest
      .spyOn(axios, "put")
      .mockResolvedValueOnce({ data: { success: true } });

    const nameInput = await screen.findByPlaceholderText("Enter Your Name");
    const updateBtn = screen.getByRole("button", { name: /update/i });

    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Another Name");
    await userEvent.click(updateBtn);

    await waitFor(() => {
      expect(putMock).toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith(
        "Updated Profile not found, please try again later"
      );
    });
  });

  it("shows error toast when backend request fails", async () => {
    await setUpAuth();
    renderPage();

    const putMock = jest
      .spyOn(axios, "put")
      .mockRejectedValueOnce(new Error("Server error"));

    const nameInput = await screen.findByPlaceholderText("Enter Your Name");
    const updateBtn = screen.getByRole("button", { name: /update/i });

    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Boom Name");
    await userEvent.click(updateBtn);

    await waitFor(() => {
      expect(putMock).toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith(
        "Updating Profile failed, please try again later"
      );
    });
  });
})