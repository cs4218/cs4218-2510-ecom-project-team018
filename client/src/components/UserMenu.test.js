import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import UserMenu from "./UserMenu";

describe("UserMenu", () => {
  test("render Dashboard title", () => {
    // ensure that the title "Dashboard" is rendered
    render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    );

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  test("render navigation links title", () => {
    // ensure that navigation links titles are rendered
    render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    );

    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("Orders")).toBeInTheDocument();
  });

  test("navigation routes", () => {
    // ensure that each navlink maps to the correct route
    render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    );

    const profileLink = screen.getByText("Profile");
    const ordersLink = screen.getByText("Orders");

    expect(profileLink).toHaveAttribute("href", "/dashboard/user/profile");
    expect(ordersLink).toHaveAttribute("href", "/dashboard/user/orders");
  });

  test("links accessibility", () => {
    // ensure that each link is accessible
    render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    );

    const links = screen.getAllByRole("link");

    expect(links).toHaveLength(2);
    links.forEach((link) => expect(link).toBeVisible());
  });
});
