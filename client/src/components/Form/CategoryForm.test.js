import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import CategoryForm from "./CategoryForm";

describe("Category Form", () => {
  test("", () => {
    // 
    render(
      <MemoryRouter>
        <CategoryForm />
      </MemoryRouter>
    );

    // expect(screen.getByText("Admin Panel")).toBeInTheDocument();
  });
});
