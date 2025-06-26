import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
    path: "../env",
});

connectDB()
    .then(() => {
        app.listen(process.env.PORT || 8000, () => {
            console.log("\nServer Started Running");
        });
    })

    .catch((error) => {
        console.log("MONGO_DB Connection Failed: ", error);
    });
