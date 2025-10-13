import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SearchProvider, useSearch } from '../../context/search';
import toast from 'react-hot-toast';
import SearchInput from './SearchInput';
import axios from 'axios';

jest.mock('axios');
jest.mock('react-hot-toast');
const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

jest.mock('react-hot-toast');

// shared mock API results used by multiple tests
const API_RESULTS = [{ _id: 'p1', name: 'Laptop' }];

describe('SearchInput integration with SearchProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function ResultsConsumer() {
    const [search] = useSearch();
    return (
      <>
        <div data-testid="search-results">{JSON.stringify(search.results)}</div>
        <div data-testid="search-keyword">{search.keyword}</div>
      </>
    );
  }

  it('performs search, stores results in context and navigates to /search', async () => {
    axios.get.mockResolvedValueOnce({ data: API_RESULTS });

    render(
      <SearchProvider>
        <MemoryRouter>
          <SearchInput />
          <ResultsConsumer />
        </MemoryRouter>
      </SearchProvider>
    );

    const input = screen.getByPlaceholderText('Search');
    const button = screen.getByRole('button', { name: /search/i });

    // type keyword and submit
    fireEvent.change(input, { target: { value: 'laptop' } });

    // after typing, context keyword should update
    await waitFor(() => expect(screen.getByTestId('search-keyword')).toHaveTextContent('laptop'));

    // submit and wait for async effects (API call, context update, navigation)
    await act(async () => {
      fireEvent.click(button);
    });

    await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith('/api/v1/product/search/laptop')
        expect(mockNavigate).toHaveBeenCalledWith('/search');
        expect(screen.getByTestId('search-results').textContent).toContain(API_RESULTS[0].name);
    });
    
  });

  it('shows toast on API failure and does not navigate', async () => {
    axios.get.mockRejectedValueOnce(new Error('network'));

    render(
      <SearchProvider>
        <MemoryRouter>
          <SearchInput />
          <ResultsConsumer />
        </MemoryRouter>
      </SearchProvider>
    );

    const input = screen.getByPlaceholderText('Search');
    const button = screen.getByRole('button', { name: /search/i });

    await act(async () => {
      fireEvent.change(input, { target: { value: 'fail' } });
      fireEvent.click(button);
    });

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Search API failed'));
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
