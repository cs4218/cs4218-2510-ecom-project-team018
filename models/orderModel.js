import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    products: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Products",
          required: true,
        },
      ],
      required: true,
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: "Order must contain at least one product.",
      },
    },

    payment: {
      type: {
        success: { type: Boolean, required: true },
      },
      required: true,
    },

    buyer: {
      type: mongoose.ObjectId,
      ref: "users",
      required: true,
    },

    status: {
      type: String,
      default: "Not Processed",
      enum: [
        "Not Processed",
        "Processing",
        "Shipped",
        "Delivered",
        "Cancelled",
      ],
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
