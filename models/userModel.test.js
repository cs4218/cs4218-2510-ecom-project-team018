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
});
