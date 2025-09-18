import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import Footer from './Footer';

describe('Footer', () => {
    test('About link points to /about', () => {
        render(
            <MemoryRouter>
                <Footer />
            </MemoryRouter>
        );
        const aboutLink = screen.getByRole('link', { name: /About/i });
        expect(aboutLink).toHaveAttribute('href', '/about');
    });

    test('Contact link points to /contact', () => {
        render(
            <MemoryRouter>
                <Footer />
            </MemoryRouter>
        );
        const contactLink = screen.getByRole('link', { name: /Contact/i });
        expect(contactLink).toHaveAttribute('href', '/contact');
    });

    test('Privacy Policy link points to /policy', () => {
        render(
            <MemoryRouter>
                <Footer />
            </MemoryRouter>
        );
        const policyLink = screen.getByRole('link', { name: /Privacy Policy/i});
        expect(policyLink).toHaveAttribute('href', '/policy');
    });
});
