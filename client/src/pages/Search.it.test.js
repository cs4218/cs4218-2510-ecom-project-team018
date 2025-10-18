import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Routes, Route, MemoryRouter } from 'react-router-dom';
import { SearchProvider } from '../context/search';
import SearchInput from '../components/Form/SearchInput';
import Search from './Search';
import axios from 'axios';
import '@testing-library/jest-dom/extend-expect';

jest.mock('axios');

jest.mock("../context/auth", () => ({
  useAuth: jest.fn(() => [null, jest.fn()]),
}));

jest.mock("../context/cart", () => ({
  useCart: jest.fn(() => [null, jest.fn()]),
}));

jest.mock("../hooks/useCategory", () =>
  jest.fn(() => [
    { _id: "c1", name: "Electronics", slug: "electronics" },
    { _id: "c2", name: "Books", slug: "books" },
  ])
);

// shared fixtures
const API_RESULTS = [
  { _id: 'p1', name: 'Laptop', description: 'Fast machine', price: 999 },
  { _id: 'p2', name: 'Mouse', description: 'Small mouse', price: 29 },
];

const LONG_DESC = 'This description is definitely longer than thirty characters';
const LONG_DESC_RESULTS = [
  { _id: 'p1', name: 'LongDescProduct', description: LONG_DESC, price: 10 },
];

const EMPTY_RESULTS = [];

describe('Full integration test Search Context, SearchInput and Search page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });


  it('performs a search and displays results on /search', async () => {
    axios.get.mockResolvedValueOnce({ data: API_RESULTS });

    render(
      <SearchProvider>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/" element={<div><SearchInput /></div>} />
            <Route path="/search" element={<Search />} />
          </Routes>
        </MemoryRouter>
      </SearchProvider>
    );

    const input = screen.getByPlaceholderText('Search');
    const button = screen.getByRole('button', { name: /search/i });

    await act(async () => {
      fireEvent.change(input, { target: { value: 'laptop' } });
      fireEvent.click(button);
    });

    // axios called
    await waitFor(() => expect(axios.get).toHaveBeenCalledWith('/api/v1/product/search/laptop'));

    // after navigation, Search page should show product names and prices
    await waitFor(() => {
      expect(screen.getByText(API_RESULTS[0].name)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('$ '+ API_RESULTS[0].price)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(API_RESULTS[0].description)).toBeInTheDocument();
    })
  });

  it('renders truncated description with ... when description length >= 30', async () => {
    axios.get.mockResolvedValueOnce({ data: LONG_DESC_RESULTS });

    render(
      <SearchProvider>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/" element={<div><SearchInput /></div>} />
            <Route path="/search" element={<Search />} />
          </Routes>
        </MemoryRouter>
      </SearchProvider>
    );

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'long' } });
      fireEvent.click(screen.getByRole('button', { name: /search/i }));
    });

    // Verify the description is truncated to 30 chars with trailing ellipses
    const expected = LONG_DESC.slice(0, 30) + '...';

    await waitFor(async () => {
        expect(axios.get).toHaveBeenCalledWith('/api/v1/product/search/long');
    });

    let descNode;
    await waitFor(async () => {
      descNode = await screen.findByText((content) => content.includes(LONG_DESC.substring(0, 30)));
    });

    expect(descNode.textContent.trim()).toBe(expected);
  });

  it('shows "No Products Found" when API returns empty array', async () => {
    axios.get.mockResolvedValueOnce({ data: EMPTY_RESULTS });

    render(
      <SearchProvider>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/" element={<div><SearchInput /></div>} />
            <Route path="/search" element={<Search />} />
          </Routes>
        </MemoryRouter>
      </SearchProvider>
    );

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'nothing' } });
      fireEvent.click(screen.getByRole('button', { name: /search/i }));
    });

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/v1/product/search/nothing');
    });

    await waitFor(() => {
      expect(screen.getByText('No Products Found')).toBeInTheDocument();
    })
  });
});