import mongoose from "mongoose";
import categorySchema from "./categoryModel";

// Mocks
jest.mock("mongoose", () => {
    const model = jest.fn();
    function Schema(definition, options) {
        this.definition = definition;
        this.options = options;
    }
    return { __esModule: true, default: {Schema, model }};
});

describe("categoryModel", () => {
    test("calls mongoose.connect with the correct name and schema", () => {
        expect(mongoose.model).toHaveBeenCalledTimes(1);
        const [modelName, schemaInstance] = mongoose.model.mock.calls[0];
        expect(modelName).toBe("Category");
        expect(schemaInstance).toBeInstanceOf(mongoose.Schema);
    });

    test("schema has expected fields", () => {
        const [, schemaInstance] = mongoose.model.mock.calls[0];
        const def = schemaInstance.definition;
        // name field
        expect(def).toHaveProperty("name");
        expect(def.name.type).toBe(String);
        expect(def.name.required).toBe(true);
        expect(def.name.unique).toBe(true);
        expect(def.name.trim).toBe(true);
        // slug field
        expect(def).toHaveProperty("slug");
        expect(def.slug.type).toBe(String);
        expect(def.slug.lowercase).toBe(true);
        expect(def.slug.trim).toBe(true);
    });
});