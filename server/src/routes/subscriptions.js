const express = require("express");
const router = express.Router();
const pool = require("../config/db");

function formatSubscription(subscription) {
  let dateStr;
  if (subscription.start_date instanceof Date) {
    // Dung local date de tranh lech mui gio khi dung toISOString() (UTC)
    const d = subscription.start_date;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    dateStr = `${year}-${month}-${day}`;
  } else {
    dateStr = String(subscription.start_date).slice(0, 10);
  }
  return { ...subscription, start_date: dateStr };
}

// GET: Lay danh sach goi dang ky
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM subscriptions ORDER BY id DESC"
    );
    res.json(result.rows.map(formatSubscription));
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Failed to fetch subscriptions" });
  }
});

// POST: Them goi dang ky moi
router.post("/", async (req, res) => {
  try {
    const { service_name, amount, currency, billing_cycle, start_date, status } =
      req.body;

    const result = await pool.query(
      `INSERT INTO subscriptions
       (service_name, amount, currency, billing_cycle, start_date, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [service_name, amount, currency, billing_cycle, start_date, status || "active"]
    );

    res.json(formatSubscription(result.rows[0]));
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Failed to create subscription" });
  }
});

//api cap nhat goi dang ki
router.put("/:id", async (req, res) => {
  try {
    const { service_name, amount, currency, billing_cycle, start_date, status } =
      req.body;

    const result = await pool.query(
      `UPDATE subscriptions
       SET service_name = $1, amount = $2, currency = $3,
           billing_cycle = $4, start_date = $5, status = $6
       WHERE id = $7
       RETURNING *`,
      [service_name, amount, currency, billing_cycle, start_date, status, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    res.json(formatSubscription(result.rows[0]));
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Failed to update subscription" });
  }
});

//api xoa goi dang ki
router.delete("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM subscriptions WHERE id = $1 RETURNING *",
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    res.json({ message: "Subscription deleted successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Failed to delete subscription" });
  }
});

module.exports = router;
