import React from "react";
import { useAuth } from "../../context/auth";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import CreateCategory from "./CreateCategory";

describe("Create Category", () => {
  test("renders all components", () => {
    render(
      <MemoryRouter>
        <CreateCategory />
      </MemoryRouter>
    );
  });
});
