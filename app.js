import express from "express";
import cors from "cors";
import morgan from "morgan";
import authRoutes from "./routes/authRoute.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import rateLimit from 'express-rate-limit';
import { xss } from 'express-xss-sanitizer';

const createApp = () => {
  const app = express();
  app.set("trust proxy", 1);

  let limiter = rateLimit({
    max: 20,
    windowMs: 1000,
    message: "We have received too many requests. Please try again later."
  })

  const corsOption = {
    origin: 'http://localhost:3000'
  }

  app.use(cors(corsOption));
  app.use(xss());
  app.use(express.json());
  app.use(morgan("dev"));

  app.use("/api/v1/auth", limiter, authRoutes);
  app.use("/api/v1/category", limiter, categoryRoutes);
  app.use("/api/v1/product", limiter, productRoutes);

  app.get("/", (req, res) => {
    res.send("<h1>Welcome to ecommerce app</h1>");
  });

  return app;
};

export default createApp;