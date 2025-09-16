import React, { useState } from "react";
import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
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

  test("set input field value when typing", async () => {
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
    await act(async () => {
      await userEvent.type(input, "Books");
    });

    // assert
    expect(input).toHaveValue("Books");
  });
});
