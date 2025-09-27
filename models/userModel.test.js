import Users from "./userModel.js";

const MOCK_USER_DATA = {
  name: "John Doe",
  email: "john.doe@example.com",
  password: "password123",
  phone: "1234567890",
  address: "123 Main St",
  answer: "Football",
  role: 1,
};

describe("User model unit tests", () => {
  it("should validate a correct user", () => {
    const user = new Users(MOCK_USER_DATA);
    const error = user.validateSync();

    expect(error).toBeUndefined();
  });

  it("should fail validation when required fields are missing", () => {
    const user = new Users({}); // empty object
    const error = user.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.name).toBeDefined();
    expect(error.errors.email).toBeDefined();
    expect(error.errors.password).toBeDefined();
    expect(error.errors.phone).toBeDefined();
    expect(error.errors.address).toBeDefined();
    expect(error.errors.answer).toBeDefined();
  });

  it("should assign default role if not provided", () => {
    const { role, ...userData } = MOCK_USER_DATA; // omit role

    const user = new Users(userData);
    const error = user.validateSync();

    expect(error).toBeUndefined();
    expect(user.role).toBe(0);
  });

  it("should enforce type validation on fields that cannot be cast", () => {
    const userData = {
      ...MOCK_USER_DATA,
      role: "not-a-number", // invalid
    };

    const user = new Users(userData);
    const error = user.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.role).toBeDefined();
  });
});
