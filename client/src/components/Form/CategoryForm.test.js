import React, { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
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

  test("renders input field with given input", () => {
    // when editing an existing category, category form should render with given input
    render(
      <CategoryForm
        handleSubmit={jest.fn()}
        value="Electronics"
        setValue={jest.fn()}
      />
    );

    expect(screen.getByPlaceholderText("Enter new category")).toHaveValue(
      "Electronics"
    );
  });

  test("set input field value when typing", () => {
    // simulate typing into the input field and checking if updated correctly
    // arrange
    const TestWrapper = () => {
      const [value, setValue] = useState("");
      return (
        <CategoryForm
          handleSubmit={jest.fn()}
          value={value}
          setValue={setValue}
        />
      );
    };

    render(<TestWrapper />);

    // act
    const input = screen.getByPlaceholderText("Enter new category");
    fireEvent.change(input, { target: { value: "Books" } });

    // assert
    expect(input).toHaveValue("Books");
  });

  test("calls handleSubmit when form is submitted", () => {
    // when the 'CategoryForm' is submitted, check that 'handleSubmit' is called
    // note: since the actual functionality is to be passed to this 'CategoryForm' component,
    // this test only checks if its called and not test the functionality

    // arrange
    const mockHandleSubmit = jest.fn();
    const TestWrapper = () => {
      const [value, setValue] = useState("");
      return (
        <CategoryForm
          handleSubmit={mockHandleSubmit}
          value={value}
          setValue={setValue}
        />
      );
    };

    render(<TestWrapper />);

    // act
    const form = screen.getByTestId("category-form");
    fireEvent.submit(form);

    // assert
    expect(mockHandleSubmit).toHaveBeenCalled();
  });
});
