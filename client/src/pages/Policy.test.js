import React from "react";
import { render, screen } from "@testing-library/react";
import Policy from "../pages/Policy";

jest.mock("./../components/Layout", () => ({ children, title }) => (
  <div data-testid="layout">
    <h1>{title}</h1>
    {children}
  </div>
));

describe("Policy Component", () => {
  it("renders the Layout with correct title", () => {
    render(<Policy />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Privacy Policy" })
    ).toBeInTheDocument();
  });

  it("renders the privacy image with correct attributes", () => {
    render(<Policy />);

    const img = screen.getByAltText("privacy");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/images/contactus.jpeg");
  });

  it("renders main headings", () => {
    render(<Policy />);

    expect(
      screen.getByRole("heading", { level: 3, name: "Privacy Policy" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Information We Collect" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "How We Use Your Information" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Cookies" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Third-Party Services" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Data Security" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Your Rights" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Changes to This Policy" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Contact Us" })
    ).toBeInTheDocument();
  });

  it("renders contact us link correctly", () => {
    render(<Policy />);

    const link = screen.getByRole("link", { name: "Contact Us" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/contact");
  });
});
