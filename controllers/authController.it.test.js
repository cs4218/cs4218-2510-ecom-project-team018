import { connectTestDB, clearDB, disconnectTestDB } from "../tests/mongoTestEnv.js";
import User from "../models/userModel.js";
import Order from "../models/orderModel.js";
import Category from "../models/categoryModel.js";
import Product from "../models/productModel.js";
import { comparePassword, hashPassword } from "./../helpers/authHelper.js";
import { updateProfileController, getOrdersController, getAllOrdersController, orderStatusController, getAllUsersController } from "./authController.js";

// Mock response object
const createMockRes = () => ({
  status: jest.fn().mockReturnThis(),
  send: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

const ORIGINAL_USER = {
    name: "John Doe",
    phone: "12345678",
    email: "john@example.com",
    address: "123 Main St",
    password: "oldhashed",
    answer: "oldanswer",
}

const ALTERNATE_USER = {
    name: "Alice",
    phone: "87654321",
    email: "jane@example.com",
    address: "456 Side St",
    password: "anotherhashed",
    answer: "anotheranswer",
}

const UPDATE_PROFILE_REQUEST = {
    name: "Bob",
    phone: "99999999",
    email: "john@example.com",
    address: "Kent Ridge",
    password: "secret123"
}

const UPDATE_PROFILE_REQUEST_SHORT_PASSWORD = {
    name: "Bob",
    phone: "99999999",
    email: "john@example.com",
    address: "Kent Ridge",
    password: "short"
}

const UPDATE_PROFILE_EMPTY_REQUEST = {
    name: null,
    phone: null,
    email: "john@example.com",
    address: null,
    password: null
}

const PRODUCT_CATEGORIES = [
    {
        name: "Electronics",
        slug: "electronics"
    },
    {
        name: "Books",
        slug: "books"
    },
    {
        name: "Clothing",
        slug: "clothing"
    }
];

const EXAMPLE_PRODUCT = {
    name: "Smartphone",
    slug: "smartphone",
    description: "A high-end smartphone with advanced features.",
    price: 999,
    quantity: 50,
    shipping: true
}

const ALTERNATE_PRODUCT = {
    name: "Laptop",
    slug: "laptop",
    description: "A powerful laptop for professionals.",
    price: 1999,
    quantity: 30,
    shipping: true
}

const WRONG_USERID = "wrongUserId";
describe("authController Test Suite", () => {
    beforeAll(async () => {
        await connectTestDB();
    });

    beforeEach(async () => {
        await clearDB();
    });

    afterAll(async () => {
        await disconnectTestDB();
    });

    describe("updateProfileController", () => {
        let user;
        let mockReq, mockRes;

        beforeEach(async () => {
            // Hashing Password before Saving to DB mimicing the real flow
            user = await User.create({...ORIGINAL_USER, password: await hashPassword(ORIGINAL_USER.password)});
            mockRes = createMockRes();
            mockReq = {};
            mockReq.user = { _id: user._id };
        });

        it("should succcessfully update user name, phone, address and password", async () => {
            mockReq.body = UPDATE_PROFILE_REQUEST;
            mockReq.user = { _id: user._id };

            await updateProfileController(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.send).toHaveBeenCalledWith({
                success: true,
                message: "Profile Updated Successfully",
                updatedUser: {
                    name: UPDATE_PROFILE_REQUEST.name,
                    phone: UPDATE_PROFILE_REQUEST.phone,
                    address: UPDATE_PROFILE_REQUEST.address,
                }
            });

            //Assert Database has been Updated
            const updated = await User.findById(user._id);
            expect(updated.name).toBe(UPDATE_PROFILE_REQUEST.name);
            expect(updated.phone).toBe(UPDATE_PROFILE_REQUEST.phone);
            expect(updated.address).toBe(UPDATE_PROFILE_REQUEST.address);
            const match = await comparePassword(UPDATE_PROFILE_REQUEST.password, updated.password);
            expect(match).toBe(true);
        });

        it("should return status 400 if password is less than 6 characters", async () => {
            mockReq.body = UPDATE_PROFILE_REQUEST_SHORT_PASSWORD;
            mockReq.user = { _id: user._id };

            await updateProfileController(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.send).toHaveBeenCalledWith({ message: "Password is required and 6 character long" });

            //Assert Database has not been Updated
            const updated = await User.findById(user._id);
            expect(updated.name).toBe(ORIGINAL_USER.name);
            expect(updated.phone).toBe(ORIGINAL_USER.phone);
            expect(updated.address).toBe(ORIGINAL_USER.address);
            const match = await comparePassword(ORIGINAL_USER.password, updated.password);
            expect(match).toBe(true);
        });

        it("should handle user not found with the req.user._id", async () => {
            mockReq.body = UPDATE_PROFILE_REQUEST;
            mockReq.user = { _id: WRONG_USERID };

            await updateProfileController(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.send).toHaveBeenCalledWith({ 
                    success: false,
                    message: "Error While Updating profile",
                    error: expect.any(Object),
            });
        });

        it("should not update user password, name, phone, or address if not provided and return status 400", async () => {
            mockReq.body = UPDATE_PROFILE_EMPTY_REQUEST;
            mockReq.user = { _id: user._id };

            await updateProfileController(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.send).toHaveBeenCalledWith({
                message: "Change Name, Password, Address or Phone to Update profile",
            });
            
            //Assert Database has not been Updated
            const updated = await User.findById(user._id);
            expect(updated.name).toBe(ORIGINAL_USER.name);
            expect(updated.phone).toBe(ORIGINAL_USER.phone);
            expect(updated.address).toBe(ORIGINAL_USER.address);
            const match = await comparePassword(ORIGINAL_USER.password, updated.password);
            expect(match).toBe(true);
        });
    })

    describe("getOrdersController", () => {
        let user;
        let created_categories;
        let product;
        let order;
        let mockReq, mockRes;

        beforeEach(async () => {
            user = await User.create(ORIGINAL_USER);
            created_categories = await Category.insertMany(PRODUCT_CATEGORIES);
            mockRes = createMockRes();
            mockReq = {};
            mockReq.user = { _id: user._id };
        });

        it("should fetch all orders from database based on user id", async () => {
            product = await Product.create({ ...EXAMPLE_PRODUCT, category: created_categories[0]._id });
            order = await Order.create({
                products: [product._id],
                payment: { success: true },
                buyer: user._id,
                status: "Processing",
            });

            await getOrdersController(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.send).toHaveBeenCalledWith([
                expect.objectContaining({
                    _id: order._id,
                    products: expect.arrayContaining([
                        expect.objectContaining({
                            _id: product._id,
                            name: EXAMPLE_PRODUCT.name,
                            slug: EXAMPLE_PRODUCT.slug,
                            description: EXAMPLE_PRODUCT.description,
                            price: EXAMPLE_PRODUCT.price,
                            quantity: EXAMPLE_PRODUCT.quantity,
                            shipping: EXAMPLE_PRODUCT.shipping,
                            category: created_categories[0]._id,
                        })
                    ]),
                    buyer: expect.objectContaining({
                        _id: user._id
                    }),
                    status: "Processing",
                    payment: expect.objectContaining({ success: true }),
                    createdAt: expect.any(Date),
                    updatedAt: expect.any(Date),
                })
            ]);
        });

        it("should return an empty array if the user has no orders", async () => {
            await Order.deleteMany({ buyer: user._id }); // Ensure no orders for this user

            await getOrdersController(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.send).toHaveBeenCalledWith([]);
        });
    });

    describe("getAllOrdersController", () => {
        let user1, user2, product1, product2, order1, order2, mockReq, mockRes;

        beforeEach(async () => {
            user1 = await User.create(ORIGINAL_USER);
            user2 = await User.create(ALTERNATE_USER);
            const category = await Category.insertMany(PRODUCT_CATEGORIES);

            product1 = await Product.create({ ...EXAMPLE_PRODUCT, category: category[0]._id });
            product2 = await Product.create({ ...ALTERNATE_PRODUCT, category: category[1]._id });

            order1 = await Order.create({
                products: [product1._id],
                payment: { success: true },
                buyer: user1._id,
                status: "Processing",
                createdAt: new Date("2024-01-01T00:00:00Z"), // older
            });

            order2 = await Order.create({
                products: [product2._id],
                payment: { success: true },
                buyer: user2._id,
                status: "Shipped",
                createdAt: new Date("2024-02-01T00:00:00Z"), // newer
            });

            mockReq = {};
            mockRes = createMockRes();
        });

        it("should fetch all orders from database", async () => {
            await getAllOrdersController(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(200);

            const response = mockRes.send.mock.calls[0][0];

            // Should return 2 orders
            expect(Array.isArray(response)).toBe(true);
            expect(response.length).toBe(2);

            // Orders should be sorted DESC by createdAt (newest first = order2)
            expect(response[0]._id.toString()).toBe(order2._id.toString());
            expect(response[1]._id.toString()).toBe(order1._id.toString());

            // Check product population (ID and name exist, photo removed)
            expect(response[0].products[0]._id.toString()).toBe(product2._id.toString());
            expect(response[0].products[0].name).toBe(product2.name);
            const product = response[0].products[0].toObject();
            expect(product.photo).toBeUndefined();

            // Check product population (Category ID exists)
            expect(response[0].products[0].category.toString()).toBe(product2.category.toString());
            expect(response[1].products[0]._id.toString()).toBe(product1._id.toString());

            // Check buyer population (only name)
            expect(response[0].buyer.name).toBe(user2.name);
            expect(response[1].buyer.name).toBe(user1.name);
        });

        it("should return empty array if no orders exist", async () => {
            // Clear only the Order collection
            await Order.deleteMany({});

            await getAllOrdersController(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.send).toHaveBeenCalledWith([]);
        });

    });

    describe("orderStatusController",() => {
        let user, product, order, mockReq, mockRes;

        beforeEach(async () => {
            clearDB();
            user = await User.create(ORIGINAL_USER);
            const category = await Category.insertMany(PRODUCT_CATEGORIES);
            product = await Product.create({ ...EXAMPLE_PRODUCT, category: category[0]._id });
            order = await Order.create({
                products: [product._id],
                payment: { success: true },
                buyer: user._id,
                status: "Processing",
            });
            mockReq = {};
            mockRes = createMockRes();
        });

        it("should update order status in database successfully", async() => {
            mockReq.params = { orderId: order._id };
            mockReq.body = { status: "Shipped" };

            await orderStatusController(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    _id: order._id,
                    status: "Shipped"
                })
            );

            //Assert Database has been Updated
            const updated = await Order.findById(order._id);
            expect(updated.status).toBe("Shipped");
        });

        it("should handle invalid orderId error", async() => {
            mockReq.params = { orderId: "wrongOrderId" };
            mockReq.body = { status: "Shipped" };
            await orderStatusController(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: "Error While Updating Order Status",
                    error: expect.any(Object),
                })
            );
        });

        it("should handle missing orderId error", async() => {
            mockReq.params = {};
            mockReq.body = { status: "Shipped" };
            await orderStatusController(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: "Error While Updating Order Status",
                    error: expect.any(Object),
                })
            );
        });

        it("should handle invalid status value error", async() => {
            mockReq.params = { orderId: order._id };
            mockReq.body = { status: "InvalidStatus" };
            await orderStatusController(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: "Error While Updating Order Status",
                    error: expect.any(Object),
                })
            );
        })
    })

    describe("getAllUsersController", () => {
        let user1, user2, mockReq, mockRes;

        beforeEach(async () => {
            clearDB();
            user1 = await User.create({
                ...ORIGINAL_USER,
                createdAt: new Date("2024-01-01T00:00:00Z")
            });
            user2 = await User.create({
                ...ALTERNATE_USER,
                createdAt: new Date("2024-02-01T00:00:00Z")
            });
            mockReq = {};
            mockRes = createMockRes();
        })

        it("should fetch all users from database", async () => {
            await getAllUsersController(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(200);
            const response = mockRes.send.mock.calls[0][0];

            expect(response.success).toBe(true);
            expect(response.message).toBe("Users fetched successfully");

            // Should return 2 users
            const { users } = response;
            expect(Array.isArray(users)).toBe(true);
            expect(users.length).toBe(2);

            // user2 was created after user1, so user2 should come first
            expect(users[0]._id.toString()).toBe(user2._id.toString());
            expect(users[1]._id.toString()).toBe(user1._id.toString());

            // Check that sensitive fields are not present
            users.forEach(u => {
                expect(u.password).toBeUndefined();
                expect(u.answer).toBeUndefined();
            })

            // Check that other fields are correct
            const fetchedUser1 = users.find(u => u._id.toString() === user1._id.toString());
            expect(fetchedUser1.name).toBe(ORIGINAL_USER.name);
            expect(fetchedUser1.email).toBe(ORIGINAL_USER.email);
            expect(fetchedUser1.phone).toBe(ORIGINAL_USER.phone);
            expect(fetchedUser1.address).toBe(ORIGINAL_USER.address);
            const fetchedUser2 = users.find(u => u._id.toString() === user2._id.toString());
            expect(fetchedUser2.name).toBe(ALTERNATE_USER.name);
            expect(fetchedUser2.email).toBe(ALTERNATE_USER.email);
            expect(fetchedUser2.phone).toBe(ALTERNATE_USER.phone);
            expect(fetchedUser2.address).toBe(ALTERNATE_USER.address);
        });

        it("should return empty array if no users exist", async () => {
            // Clear only the User collection
            await User.deleteMany({});
            mockRes = createMockRes();

            await getAllUsersController(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.send).toHaveBeenCalledWith(
                {
                    "message": "Users fetched successfully",
                    "success": true,
                    "users": []
                }
            );
        });
    })
});
