import React from "react";
import { render, screen } from "@testing-library/react";
import Users from "./Users";

// mock components
jest.mock("../../components/Layout", () => (props) => (
  <div data-testid="Layout">{props.children}</div>
));

jest.mock("../../components/AdminMenu", () => () => (
  <div data-testid="AdminMenu" />
));

describe("Users page", () => {
  test("renders components correctly", async () => {
    render(<Users />);

    // components
    expect(await screen.findByTestId("Layout")).toBeInTheDocument();
    expect(screen.getByTestId("AdminMenu")).toBeInTheDocument();

    // heading
    expect(
      screen.getByRole("heading", { name: /all users/i })
    ).toBeInTheDocument();
  });
});
