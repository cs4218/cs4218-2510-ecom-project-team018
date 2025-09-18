import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import toast from "react-hot-toast";
import Orders from "./Orders";

jest.mock("axios");
jest.mock("react-hot-toast");

jest.mock("../../hooks/useCategory", () => jest.fn(() => []));
