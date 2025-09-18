import React from 'react';
import { render, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Spinner from './Spinner';
import { useNavigate, useLocation } from 'react-router-dom';

// Mocks
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: jest.fn(),
    useLocation: jest.fn(),
  };
});

let navigateMock;

beforeEach(() => {
  jest.useFakeTimers();
  navigateMock = jest.fn();
  useNavigate.mockReturnValue(navigateMock);
  useLocation.mockReturnValue({ pathname: '/protected' });
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  jest.clearAllMocks();
});

describe('Spinner', () => {
  test('navigates to /login by default after 3 seconds', () => {
    render(<Spinner />);
    act(() => { jest.advanceTimersByTime(3000); });
    expect(navigateMock).toHaveBeenCalledWith('/login', { state: '/protected' });
  });

  test('navigates to custom path when provided', () => {
    render(<Spinner path="dashboard" />);
    act(() => { jest.advanceTimersByTime(3000); });
    expect(navigateMock).toHaveBeenCalledWith('/dashboard', { state: '/protected' });
  });

  test('does not navigate before 3 seconds', () => {
    render(<Spinner />);
    act(() => { jest.advanceTimersByTime(2000); });
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
