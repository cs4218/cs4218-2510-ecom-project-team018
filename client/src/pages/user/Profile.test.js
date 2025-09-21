import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import toast from 'react-hot-toast';
import axios from 'axios';
import Profile from './Profile';

jest.mock('axios');

jest.mock("../../context/search", () => ({
  useSearch: jest.fn(),
}));

jest.mock('react-hot-toast');

const ACCOUNT_EMAIL = "alice@example.com";
const ORIGINAL_NAME = "Alice";
const ORIGINAL_PHONE = "12345678";
const ORIGINAL_ADDRESS = "42 Wallaby Way";

const mockSetAuth = jest.fn();
const baseAuth = {
  user: {
    name: ORIGINAL_NAME,
    email: ACCOUNT_EMAIL,
    phone: ORIGINAL_PHONE,
    address: ORIGINAL_ADDRESS,
  },
  token: "token-123",
};

const newInputValues = {
    name: "Bob",
    phone: "99999999",
    address: "kent Ridge",
    password: "secret123"
}

jest.mock("../../context/auth", () => ({
  useAuth: jest.fn(() => [baseAuth, mockSetAuth]),
}));


jest.mock("../../context/cart", () => ({
  useCart: jest.fn(() => [null, jest.fn()]),
}));

jest.mock("../../hooks/useCategory", () =>
  jest.fn(() => [
    { _id: "c1", name: "Electronics", slug: "electronics" },
    { _id: "c2", name: "Books", slug: "books" },
  ])
);

jest.mock("../../context/search", () => ({
    useSearch: jest.fn(() => [[], jest.fn()]),
}))

let store = {};

Object.defineProperty(window, "localStorage", {
  value: {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (i) => Object.keys(store)[i] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  },

  writable: true,
});

window.matchMedia = window.matchMedia || function() {
    return {
        matches: false,
        addListener: function() {},
        removeListener: function() {}
    };
};

describe('Profile Page', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        window.localStorage.clear();
        window.localStorage.setItem(
            "auth",
            JSON.stringify({ user: baseAuth.user, token: baseAuth.token })
        );
    });

    it("renders inputs prefilled from auth.user and email input is disabled", async () => {
        const { findByPlaceholderText } = render(
            <MemoryRouter initialEntries={['/dashboard/user/profile']}>
                <Routes>
                    <Route path="/dashboard/user/profile" element={<Profile />} />
                </Routes>
            </MemoryRouter>
        )

        const name = await findByPlaceholderText(/enter your name/i);
        const email = await findByPlaceholderText(/enter your email/i);
        const phone = await findByPlaceholderText(/enter your phone/i);
        const address = await findByPlaceholderText(/enter your address/i);

        expect(name).toHaveValue(baseAuth.user.name);
        expect(email).toHaveValue(baseAuth.user.email);
        expect(email).toBeDisabled();
        expect(phone).toHaveValue(baseAuth.user.phone);
        expect(address).toHaveValue(baseAuth.user.address);
    });

    it("updates local input state when the user types", async () => {
        const { findByPlaceholderText } = render(
            <MemoryRouter initialEntries={['/dashboard/user/profile']}>
                <Routes>
                    <Route path="/dashboard/user/profile" element={<Profile />} />
                </Routes>
            </MemoryRouter>
        )

        const name = await findByPlaceholderText(/enter your name/i);
        const phone = await findByPlaceholderText(/enter your phone/i);
        const address = await findByPlaceholderText(/enter your address/i);
        const password = await findByPlaceholderText(/enter your password/i);

        await act( async () => {
            await userEvent.clear(name);
            await userEvent.type(name, newInputValues.name);
            await userEvent.clear(phone);
            await userEvent.type(phone, newInputValues.phone);
            await userEvent.clear(address);
            await userEvent.type(address, newInputValues.address);
            await userEvent.type(password, newInputValues.password);
        })

        expect(name).toHaveValue(newInputValues.name);
        expect(phone).toHaveValue(newInputValues.phone);
        expect(address).toHaveValue(newInputValues.address);
        expect(password).toHaveValue(newInputValues.password);
    });

    it('Successful Submission updates Auth, Local Storage and Shows Success Toast', async () => {
        axios.put.mockResolvedValueOnce({
            data: { 
                message: "Profile Updated Successfully",
                success: true,
                updatedUser: { ...baseAuth.user, name: "Alice Smith" } },
        });

        const { findByPlaceholderText, getByRole } = render(
            <MemoryRouter initialEntries={['/dashboard/user/profile']}>
                <Routes>
                    <Route path="/dashboard/user/profile" element={<Profile />} />
                </Routes>
            </MemoryRouter>
        )

        const name = await findByPlaceholderText(/enter your name/i);
        const phone = await findByPlaceholderText(/enter your phone/i);
        const address = await findByPlaceholderText(/enter your address/i);
        const password = await findByPlaceholderText(/enter your password/i);

        const submit = getByRole("button", { name: /update/i });

        await act( async () => {
            await userEvent.clear(name);
            await userEvent.type(name, newInputValues.name);
            await userEvent.clear(password);
            await userEvent.type(password, newInputValues.password);
            await userEvent.clear(phone);
            await userEvent.type(phone, newInputValues.phone);
            await userEvent.clear(address);
            await userEvent.type(address, newInputValues.address)
            await userEvent.click(submit);
        })

        await waitFor(() => {
            // axios payload correct
            expect(axios.put).toHaveBeenCalledWith("/api/v1/auth/profile", {
                name: newInputValues.name,
                email: ACCOUNT_EMAIL, // disabled but still sent
                password: newInputValues.password,
                phone: newInputValues.phone,
                address: newInputValues.address,
            });

            expect(mockSetAuth).toHaveBeenCalledWith(
                expect.objectContaining({
                    user: expect.objectContaining({ name: newInputValues.name }),
                })
            )

            // localStorage updated
            const saved = JSON.parse(window.localStorage.getItem("auth"));
            expect(saved.user.name).toBe(newInputValues.name);

            // toast success
            expect(toast.success).toHaveBeenCalledWith(
                "Profile Updated Successfully"
            );
        });
    });

    it("Shows Toast Error if updating Profile with auth/profile API fails", async () => {
        axios.put.mockRejectedValueOnce(new Error("Network Error"));

        const { findByRole } = render(
            <MemoryRouter initialEntries={['/dashboard/user/profile']}>
                <Routes>
                    <Route path="/dashboard/user/profile" element={<Profile />} />
                </Routes>
            </MemoryRouter>
        );

        const submit = await findByRole("button", { name: /update/i });
        await userEvent.click(submit);

        await waitFor(() => {
            expect(axios.put).toHaveBeenCalled();
            expect(toast.error).toHaveBeenCalledWith("Updating Profile Failed, please try again later");
            expect(mockSetAuth).not.toHaveBeenCalled();
        });
    });

    it("Shows Toast Error if updating Profile with API auth/profile API has data.success == false in response", async () => {
        axios.put.mockResolvedValueOnce({
            data: { 
                message: "Profile Update Failure",
                success: false,
                updatedUser: { ...baseAuth.user, name: "Alice Smith" } },
        });

        const { findByRole } = render(
            <MemoryRouter initialEntries={['/dashboard/user/profile']}>
                <Routes>
                    <Route path="/dashboard/user/profile" element={<Profile />} />
                </Routes>
            </MemoryRouter>
        );

        const submit = await findByRole("button", { name: /update/i });
        await userEvent.click(submit);

        await waitFor(() => {
            expect(axios.put).toHaveBeenCalled();
            expect(toast.error).toHaveBeenCalledWith("Updating Profile unsuccessful, please try again later");
            expect(mockSetAuth).not.toHaveBeenCalled();
        });
    })

    it("shows toast error and does not call axios if password is empty", async () => {
        const { findByPlaceholderText, getByRole } = render(
            <MemoryRouter initialEntries={['/dashboard/user/profile']}>
            <Routes>
                <Route path="/dashboard/user/profile" element={<Profile />} />
            </Routes>
            </MemoryRouter>
        );

        const password = await findByPlaceholderText(/enter your password/i);
        const submit = getByRole("button", { name: /update/i });

        await act(async () => {
            await userEvent.clear(password);
            await userEvent.click(submit);
        });

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Password must be at least 6 characters long");
            expect(axios.put).not.toHaveBeenCalled();
        });
    });

    it("shows toast error and does not call axios if password is shorter than 6 characters", async () => {
        const { findByPlaceholderText, getByRole } = render(
            <MemoryRouter initialEntries={['/dashboard/user/profile']}>
            <Routes>
                <Route path="/dashboard/user/profile" element={<Profile />} />
            </Routes>
            </MemoryRouter>
        );

        const password = await findByPlaceholderText(/enter your password/i);
        const submit = getByRole("button", { name: /update/i });

        await act(async () => {
            await userEvent.clear(password);
            await userEvent.type(password, "123");
            await userEvent.click(submit);
        });

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Password must be at least 6 characters long");
            expect(axios.put).not.toHaveBeenCalled();
        });
    });
})