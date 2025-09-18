import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Header from './Header';
import { MemoryRouter } from 'react-router-dom';

import { useAuth } from '../context/auth';
import { useCart } from '../context/cart';
import useCategory from '../hooks/useCategory';
import toast from 'react-hot-toast';

// Mocks
jest.mock('./Form/SearchInput', () => () => <div data-testid="search-input-mock" />);
jest.mock('antd', () => ({
    Badge: ({ count, children }) => (
        <div data-testid="badge" data-count={count}>
            {children}
        </div>
    ),
}));
jest.mock('../context/auth', () => ({
  __esModule: true,
  useAuth: jest.fn(),
}));
jest.mock('../context/cart', () => ({
  __esModule: true,
  useCart: jest.fn(),
}));
jest.mock('../hooks/useCategory', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('react-hot-toast', () => ({
    __esModule: true,
    default: { success: jest.fn() },
}));

const renderWithRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);
let setAuthMock;

beforeEach(() => {
    setAuthMock = jest.fn();
    useAuth.mockReturnValue([{ user: null, token: '' }, setAuthMock]);
    useCart.mockReturnValue([[]]);
    useCategory.mockReturnValue([]);
});

afterEach(() => {
    jest.clearAllMocks();
});

describe('Header', () => {
    test('renders brand link', () => {
        renderWithRouter(<Header />);
        const brand = screen.getByText('🛒 Virtual Vault');
        expect(brand).toBeInTheDocument();
    });

    test('renders SearchInput', () => {
        renderWithRouter(<Header />);
        const search = screen.getByTestId('search-input-mock');
        expect(search).toBeInTheDocument();
    });

    test('renders Home link', () => {
        renderWithRouter(<Header />);
        const homeLink = screen.getByRole('link', { name: /home/i });
        expect(homeLink).toHaveAttribute('href', '/');
    });

    test('renders Cart link', () => {
        renderWithRouter(<Header />);
        const cartLink = screen.getByRole('link', { name: /cart/i });
        expect(cartLink).toHaveAttribute('href', '/cart');
    });

    test('shows Register and Login when logged out', () => {
        useAuth.mockReturnValue([{ user: null, token: '' }, setAuthMock]);
        renderWithRouter(<Header />);
        const register = screen.getByRole('link', { name: /register/i });
        const login = screen.getByRole('link', { name: /login/i });
        expect(register).toBeInTheDocument();
        expect(login).toBeInTheDocument();
    });

    test('shows user name and dashboard when logged as admin', () => {
        useAuth.mockReturnValue([{ user: { name: 'Alice', role: 1 }, token: 'abc' }, setAuthMock]);
        renderWithRouter(<Header />);
        const username = screen.getByText('Alice');
        const dashboard = screen.getByRole('link', { name: /dashboard/i });
        expect(username).toBeInTheDocument();
        expect(dashboard).toHaveAttribute('href', '/dashboard/admin');
    });

    test('shows user dashboard path for non-admin', () => {
        useAuth.mockReturnValue([{ user: { name: 'Bob', role: 0 }, token: 'xyz' }, setAuthMock]);
        renderWithRouter(<Header />);
        const dashboard = screen.getByRole('link', { name: /dashboard/i });
        expect(dashboard).toHaveAttribute('href', '/dashboard/user');
    });

    test('renders categories from hook', () => {
        useCategory.mockReturnValue([
            { name: 'Phones', slug: 'phones' },
            { name: 'Laptops', slug: 'laptops' },
        ]);
        renderWithRouter(<Header />);
        const phones = screen.getByRole('link', { name: 'Phones' });
        const laptops = screen.getByRole('link', { name: 'Laptops' });
        expect(phones).toHaveAttribute('href', '/category/phones');
        expect(laptops).toHaveAttribute('href', '/category/laptops');
    });

    test('badge shows cart count', () => {
        useCart.mockReturnValue([[{ id: 1 }, { id: 2 }, { id: 3 }]]);
        renderWithRouter(<Header />);
        const badge = screen.getByTestId('badge');
        expect(badge).toHaveAttribute('data-count', '3');
    });

    test('logout clears auth, removes localStorage, and shows toast', () => {
        useAuth.mockReturnValue([{ user: { name: 'Alice', role: 0}, token: 'abc'}, setAuthMock]);
        const removeSpy = jest.spyOn(Storage.prototype, 'removeItem');
        renderWithRouter(<Header />);
        const logoutLink = screen.getByRole('link', { name: /logout/i });
        fireEvent.click(logoutLink);
        expect(setAuthMock).toHaveBeenCalledWith(expect.objectContaining({ user: null, token: '' }));
        expect(removeSpy).toHaveBeenCalledWith('auth');
        expect(toast.success).toHaveBeenCalledWith('Logout Successfully');
        removeSpy.mockRestore();

    });
});