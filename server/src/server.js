const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const subscriptionsRouter = require("./routes/subscriptions");
app.use("/api/subscriptions", subscriptionsRouter);

const pool = require("./config/db");

app.get("/api/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ status: "OK", databaseTime: result.rows[0].now });
  } catch (error) {
    console.error("Database connection failed:", error.message);
    res.status(500).json({ status: "ERROR", message: "Database connection failed" });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "SubTracker API is running!" });
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});