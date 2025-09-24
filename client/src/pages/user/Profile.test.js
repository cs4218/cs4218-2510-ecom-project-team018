import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { useAuth } from '../../context/auth';
import '@testing-library/jest-dom/extend-expect';
import toast from 'react-hot-toast';
import axios from 'axios';
import Profile from './Profile';

jest.mock('axios');
jest.mock('react-hot-toast');

const baseAuth = {
  user: {
    name: "Alice",
    email: "alice@example.com",
    password: "secret456",
    phone: "12345678",
    address: "42 Wallaby Way",
  },
  token: "token-123",
};

const newInputValues = {
    name: "Bob",
    phone: "99999999",
    address: "Kent Ridge",
    password: "secret123"
}

const mockSetAuth = jest.fn();

jest.mock('../../context/auth', () => ({
  useAuth:  jest.fn(),
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
        useAuth.mockReturnValue([baseAuth, mockSetAuth])
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
            await userEvent.clear(password);
            await userEvent.type(password, newInputValues.password);
        })

        expect(name).toHaveValue(newInputValues.name);
        expect(phone).toHaveValue(newInputValues.phone);
        expect(address).toHaveValue(newInputValues.address);
        expect(password).toHaveValue(newInputValues.password);
    });

    it("updates auth, local storage and shows success toast upon successful submission", async () => {
        axios.put.mockResolvedValueOnce({
            data: {
                message: "Profile Updated Successfully",
                success: true,
                updatedUser: {
                    ...newInputValues,
                    email: "alice@example.com",   
                },
            }
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
                email: "alice@example.com",
                password: newInputValues.password,
                phone: newInputValues.phone,
                address: newInputValues.address,
            });

            expect(mockSetAuth).toHaveBeenCalledWith(
                expect.objectContaining(
                    { token: "token-123", user: {
                        name: newInputValues.name,
                        email: "alice@example.com",
                        password: newInputValues.password,
                        phone: newInputValues.phone,
                        address: newInputValues.address,
                    } }),
                )
        })

        // localStorage updated
        const saved = JSON.parse(window.localStorage.getItem("auth"));
        expect(saved.user.name).toBe(newInputValues.name);

        // toast success
        expect(toast.success).toHaveBeenCalledWith(
            "Profile Updated Successfully"
        );
    });

    it("shows Toast Error if updating Profile with auth/profile API fails", async () => {
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
            expect(toast.error).toHaveBeenCalledWith("Updating Profile failed, please try again later");
            expect(mockSetAuth).not.toHaveBeenCalled();
        });
    });

    it("shows Toast Error if updating Profile with auth/profile API has data.success == false in response", async () => {
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

    it("shows toast error amd not call setAuth if API response success == true but updatedUser is null", async () => {
        axios.put.mockResolvedValueOnce({
            data: { success: true, updatedUser: null },
        });

        const { findByRole } = render(
            <MemoryRouter initialEntries={["/dashboard/user/profile"]}>
            <Routes>
                <Route path="/dashboard/user/profile" element={<Profile />} />
            </Routes>
            </MemoryRouter>
        );

        const submit = await findByRole("button", { name: /update/i });
        await userEvent.click(submit);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith(
                "Updated Profile not found, please try again later"
            );
            expect(mockSetAuth).not.toHaveBeenCalled();
        });
    });


    it("shows toast error and does not call axios if password is shorter than 6 characters and greater than 0 Characters", async () => {
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
            await userEvent.type(password, "1");
            await userEvent.click(submit);
        });

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Password must be at least 6 characters long");
            expect(axios.put).not.toHaveBeenCalled();
        });
    });

    it("shows error toast and does not call API when auth token is missing", async () => {
        useAuth.mockReturnValue([null, jest.fn()]);

        render(
            <MemoryRouter initialEntries={['/dashboard/user/profile']}>
                <Routes>
                <Route path="/dashboard/user/profile" element={<Profile />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith(
                "Unable to retrieve profile, please sign out and sign in again."
            );
        });
    });
})
