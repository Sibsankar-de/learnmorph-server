import { app } from "./app.js";
import { connectDb } from "./db/index.js";
import "dotenv/config"


connectDb()
    .then(() => {
        app.listen(process.env.PORT, () => {
            console.log("Server is listening on port - ", process.env.PORT);

        })
    })