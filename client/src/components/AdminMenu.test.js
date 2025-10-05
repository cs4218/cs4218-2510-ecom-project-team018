import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import AdminMenu from "./AdminMenu";

describe("AdminMenu", () => {
  test("render Admin Panel title", () => {
    // ensure that the title "Admin Panel" is rendered
    render(
      <MemoryRouter>
        <AdminMenu />
      </MemoryRouter>
    );

    expect(screen.getByText("Admin Panel")).toBeInTheDocument();
  });

  test("render navigation links title", () => {
    // ensure that navigation links titles are rendered
    render(
      <MemoryRouter>
        <AdminMenu />
      </MemoryRouter>
    );

    expect(screen.getByText("Create Category")).toBeInTheDocument();
    expect(screen.getByText("Create Product")).toBeInTheDocument();
    expect(screen.getByText("Products")).toBeInTheDocument();
    expect(screen.getByText("Orders")).toBeInTheDocument();
  });

  test("navigation routes", () => {
    // ensure that each navlink maps to the correct route
    render(
      <MemoryRouter>
        <AdminMenu />
      </MemoryRouter>
    );

    const createCategoryLink = screen.getByText("Create Category");
    const createProductLink = screen.getByText("Create Product");
    const productsLink = screen.getByText("Products");
    const ordersLink = screen.getByText("Orders");

    expect(createCategoryLink).toHaveAttribute(
      "href",
      "/dashboard/admin/create-category"
    );
    expect(createProductLink).toHaveAttribute(
      "href",
      "/dashboard/admin/create-product"
    );
    expect(productsLink).toHaveAttribute("href", "/dashboard/admin/products");
    expect(ordersLink).toHaveAttribute("href", "/dashboard/admin/orders");
  });

  test("links accessibility", () => {
    // ensure that each link is accessible
    render(
      <MemoryRouter>
        <AdminMenu />
      </MemoryRouter>
    );

    const links = screen.getAllByRole("link");

    expect(links).toHaveLength(5);
    links.forEach((link) => expect(link).toBeVisible());
  });
});
