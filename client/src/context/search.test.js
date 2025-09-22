import React from "react";
import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import axios from "axios";
import { useSearch, SearchProvider } from "./auth";

jest.mock("axios");

const MOCK_SEARCH_DATA = {
    keyword: "Notebook",
    results: [
        {
            category: "Books",
            createdAt: "2025-09-21T06:18:06.666Z",
            updatedAt: "2025-09-21T06:18:06.666Z",
            description: "A plain notebook",
            name: "Notebook",
            price: 10,
            quantity: 1,
            slug: "Notebook",
            __v: 0,
            _id: "68cf989e7c5559b3bbceb825"
        }
    ]
}

// Test Component to access the auth context
const TestComponent = ({ })

