import React from "react";
import { render, screen } from "@testing-library/react";
import Contact from "../pages/Contact";

jest.mock("./../components/Layout", () => ({ children, title }) => (
  <div data-testid="layout">
    <h1>{title}</h1>
    {children}
  </div>
));

describe("Contact Component", () => {
  it("renders the Layout with correct title", () => {
    render(<Contact />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Contact us" })
    ).toBeInTheDocument();
  });

  it("renders the contact image with correct attributes", () => {
    render(<Contact />);
    const img = screen.getByAltText("contactus");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/images/contactus.jpeg");
  });

  it("renders the CONTACT US heading", () => {
    render(<Contact />);
    expect(
      screen.getByRole("heading", { level: 1, name: "CONTACT US" })
    ).toBeInTheDocument();
  });

  it("renders contact details", () => {
    render(<Contact />);
    expect(screen.getByText(/help@ecommerceapp\.com/i)).toBeInTheDocument();
    expect(screen.getByText(/012-3456789/)).toBeInTheDocument();
    expect(screen.getByText(/1800-0000-0000/)).toBeInTheDocument();
  });
});
