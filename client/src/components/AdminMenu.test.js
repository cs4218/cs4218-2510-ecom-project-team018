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
});
