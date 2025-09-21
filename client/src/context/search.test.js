import React from "react";
import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import axios from "axios";
import { useSearch, SearchProvider } from "./auth";

jest.mock("axios");

const MOCK_SEARCH_DATA = {
    
}