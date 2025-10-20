import express from "express";
import cors from "cors";
import morgan from "morgan";
import authRoutes from "./routes/authRoute.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import productRoutes from "./routes/productRoutes.js";

const createApp = () => {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(morgan("dev"));

  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/category", categoryRoutes);
  app.use("/api/v1/product", productRoutes);

  app.get("/", (req, res) => {
    res.send("<h1>Welcome to ecommerce app</h1>");
  });

  return app;
};

export default createApp;
