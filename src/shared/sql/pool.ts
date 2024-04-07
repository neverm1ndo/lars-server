import { createPool } from "mysql2";

export const MSQLPool = createPool({
    host: process.env.DB_ADDRESS,
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD
});