import colors from "colors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import createApp from "./app.js";

// configure env
dotenv.config();

//database config
connectDB();

const app = createApp();

const PORT = process.env.PORT || 6060;

app.listen(PORT, () => {
    console.log(`Server running on ${process.env.DEV_MODE} mode on ${PORT}`.bgCyan.white);
});
