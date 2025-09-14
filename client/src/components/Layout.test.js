import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Layout from './Layout';

// Mocks
jest.mock('./Header', () => () => <div data-testid="header-mock" />);
jest.mock('./Footer', () => () => <div data-testid="footer-mock" />);
jest.mock('react-hot-toast', () => ({ Toaster: () => <div data-testid="toaster-mock" />}));

afterEach(() => {
    document.head.innerHTML = '';
    document.title = '';
});

describe('Layout', () => {
    test('renders children', () => {
        render(<Layout>Child content</Layout>);
        const child = screen.getByText('Child content');
        expect(child).toBeInTheDocument();
    });

    test('renders Header', () => {
        render(<Layout />);
        const header = screen.getByTestId('header-mock');
        expect(header).toBeInTheDocument();
    });

    test('renders Footer', () => {
        render(<Layout />);
        const footer = screen.getByTestId('footer-mock');
        expect(footer).toBeInTheDocument();
    });

    test('renders toaster', () => {
        render(<Layout />);
        const toaster = screen.getByTestId('toaster-mock');
        expect(toaster).toBeInTheDocument();
    });

    test('sets title', async () => {
        render(<Layout title="My Title" />);
        await waitFor(() => {
            const currentTitle = document.title;
            expect(currentTitle).toBe('My Title');
        });
    });

    test('sets description', async () => {
        render(<Layout description="my description" />);
        await waitFor(() => {
            const currentDescription = document.querySelector('meta[name="description"]');
            expect(currentDescription).toHaveAttribute('content', 'my description');
        });
    });

    test('sets keywords', async () => {
        render(<Layout keywords="my keywords" />);
        await waitFor(() => {
            const currentKeywords = document.querySelector('meta[name="keywords"]');
            expect(currentKeywords).toHaveAttribute('content', 'my keywords');
        });
    });

    test('sets author', async () => {
        render(<Layout author="my author" />);
        await waitFor(() => {
            const currentAuthor = document.querySelector('meta[name="author"]');
            expect(currentAuthor).toHaveAttribute('content', 'my author');
        });

    });
});
