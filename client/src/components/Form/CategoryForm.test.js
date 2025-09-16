import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import CategoryForm from "./CategoryForm";

describe("Category Form", () => {
  test("renders input field with placeholder", () => {
    // if no value entered, placeholder value shows
    render(
      <CategoryForm handleSubmit={jest.fn()} value="" setValue={jest.fn()} />
    );

    expect(
      screen.getByPlaceholderText("Enter new category")
    ).toBeInTheDocument();
  });
});
