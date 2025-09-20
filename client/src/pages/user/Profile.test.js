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

const mockSetAuth = jest.fn();
const baseAuth = {
  user: {
    name: "Alice",
    email: "alice@example.com",
    phone: "12345678",
    address: "42 Wallaby Way",
  },
  token: "token-123",
};

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

        expect(name).toHaveValue("Alice");
        expect(email).toHaveValue("alice@example.com");
        expect(email).toBeDisabled();
        expect(phone).toHaveValue("12345678");
        expect(address).toHaveValue("42 Wallaby Way");
    });

    it("typing updates local input state", async () => {
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
            await userEvent.type(name, "Bob");
            await userEvent.clear(phone);
            await userEvent.type(phone, "9999");
            await userEvent.clear(address);
            await userEvent.type(address, "New Addr");
            await userEvent.type(password, "secret!");
        })

        expect(name).toHaveValue("Bob");
        expect(phone).toHaveValue("9999");
        expect(address).toHaveValue("New Addr");
        expect(password).toHaveValue("secret!");
    });

    it('Successful Submission updates Auth, Local Storage and Shows Success Toast', async () => {
        axios.put.mockResolvedValueOnce({
            data: { updatedUser: { ...baseAuth.user, name: "Alice Smith" } },
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
            await userEvent.type(name, "Alice Smith");
            await userEvent.clear(password);
            await userEvent.type(password, "newpass");
            await userEvent.clear(phone);
            await userEvent.type(phone, "90000000");
            await userEvent.clear(address);
            await userEvent.type(address, "NUS")
            await userEvent.click(submit);
        })

        await waitFor(() => {
            // axios payload correct
            expect(axios.put).toHaveBeenCalledWith("/api/v1/auth/profile", {
                name: "Alice Smith",
                email: "alice@example.com", // disabled but still sent
                password: "newpass",
                phone: "90000000",
                address: "NUS",
            });

            expect(mockSetAuth).toHaveBeenCalledWith(
                expect.objectContaining({
                    user: expect.objectContaining({ name: "Alice Smith" }),
                })
            )

            // localStorage updated
            const saved = JSON.parse(window.localStorage.getItem("auth"));
            console.log(saved)
            expect(saved.user.name).toBe("Alice Smith");

            // toast success
            expect(toast.success).toHaveBeenCalledWith(
                "Profile Updated Successfully"
            );
        });
    });

    it("Shows Toast Error if Updating of Profile returns data.errro == True in API response", async () => {
        axios.put.mockResolvedValueOnce({
            data: { errro: true, error: "Invalid Input" }
        })

        const { findByRole } = render(
            <MemoryRouter initialEntries={['/dashboard/user/profile']}>
                <Routes>
                    <Route path="/dashboard/user/profile" element={<Profile />} />
                </Routes>
            </MemoryRouter>
        )

        const submit = await findByRole("button", { name: /update/i });
        await userEvent.click(submit);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Invalid Input");
            expect(mockSetAuth).not.toHaveBeenCalled();
        });
    });
})