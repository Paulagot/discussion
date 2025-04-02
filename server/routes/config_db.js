import mysql from "mysql2";
import fs from "node:fs";
import dotenv from "dotenv";

dotenv.config()
// ✅ Load the correct .env file based on NODE_ENV
const envFile = process.env.NODE_ENV === "production" ? ".env.production" : ".env.development";
dotenv.config({ path: envFile });

// ✅ Wait for environment variables to be available
console.log("✅ ENV File Loaded:", process.env.NODE_ENV);
console.log("🔍 [db_config.js] Checking Database Environment Variables:");
console.log("Database Host:", process.env.DATABASE_HOST || "MISSING");
console.log("Database User:", process.env.DATABASE_USER || "MISSING");
console.log("Database Password:", process.env.DATABASE_PASSWORD ? "SET" : "MISSING");
console.log("Database Name:", process.env.DATABASE_NAME || "MISSING");
console.log('Using .env.development:', process.env.NODE_ENV !== 'production'); // Update this line

const pool = mysql.createPool({
  
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});



// Test Database Connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Database Connection Failed in db_config.js:", err.message);
  } else {
    console.log("✅ [db.js] Successfully Connected to the Database!");
    connection.release();
  }
});


export default pool;




