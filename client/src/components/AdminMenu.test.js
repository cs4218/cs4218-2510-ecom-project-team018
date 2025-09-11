import React from 'react';
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from 'react-router-dom';
import AdminMenu from "./AdminMenu";

describe("AdminMenu", () => {
  test("render Admin Panel title", () => {
    render(
      <MemoryRouter>
        <AdminMenu />
      </MemoryRouter>
    );

    expect(screen.getByText("Admin Panel")).toBeTruthy();
  });
});
