require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Razorpay = require("razorpay");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 5000;
const PRICE_PAISE = 4900;
const ACCESS_DAYS = 150;

const requiredEnv = ["DATABASE_URL","RAZORPAY_KEY_ID","RAZORPAY_KEY_SECRET","RAZORPAY_WEBHOOK_SECRET","JWT_SECRET"];
for (const key of requiredEnv) {
  if (!process.env[key]) { console.error(`Missing: ${key}`); process.exit(1); }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false }
});

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

app.use(cors({
  origin: (process.env.FRONTEND_ORIGIN || "").split(",").map(x => x.trim()).filter(Boolean)
}));

function verifySignature(expected, received) {
  if (!received || !expected) return false;
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(received, "hex");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch { return false; }
}

// FIX: json parser upar lana zaroori hai
app.use((req, res, next) => {
  if (req.originalUrl === "/api/razorpay-webhook") return next();
  express.json({ limit: "1mb" })(req, res, next);
});

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ceg_users (id SERIAL PRIMARY KEY, email VARCHAR(255) UNIQUE NOT NULL, password_hash TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS ceg_orders (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES ceg_users(id), razorpay_order_id VARCHAR(100) UNIQUE NOT NULL, amount INTEGER NOT NULL, status VARCHAR(30) DEFAULT 'created', created_at TIMESTAMPTZ DEFAULT NOW(), paid_at TIMESTAMPTZ);
    CREATE TABLE IF NOT EXISTS ceg_payments (id SERIAL PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES ceg_orders(id), razorpay_payment_id VARCHAR(100) UNIQUE NOT NULL, amount INTEGER NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS ceg_entitlements (user_id INTEGER PRIMARY KEY REFERENCES ceg_users(id), expires_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW());
  `);
  console.log("Database tables ready");
}

function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Login required" });
  try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { return res.status(401).json({ error: "Invalid or expired login" }); }
}

app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const cleanEmail = String(email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return res.status(400).json({ error: "Valid email required" });
    if (typeof password !== "string" || password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(`INSERT INTO ceg_users (email, password_hash) VALUES ($1, $2) RETURNING id, email`, [cleanEmail, hash]);
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.status(201).json({ token, user });
  } catch (error) {
    if (error.code === "23505") return res.status(409).json({ error: "Email already registered" });
    console.error(error); res.status(500).json({ error: "Registration failed" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const cleanEmail = String(email || "").trim().toLowerCase();
    const result = await pool.query("SELECT * FROM ceg_users WHERE email = $1", [cleanEmail]);
    const user = result.rows[0];
    if (!user || !await bcrypt.compare(password || "", user.password_hash)) return res.status(401).json({ error: "Incorrect email or password" });
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (error) { console.error(error); res.status(500).json({ error: "Login failed" }); }
});

app.post("/api/create-order", authenticate, async (req, res) => {
  try {
    const razorpayOrder = await razorpay.orders.create({ amount: PRICE_PAISE, currency: "INR", receipt: `ceg_${Date.now()}_${req.user.id}`, notes: { user_id: String(req.user.id), plan: `${ACCESS_DAYS}_days` } });
    await pool.query(`INSERT INTO ceg_orders (user_id, razorpay_order_id, amount) VALUES ($1, $2, $3)`, [req.user.id, razorpayOrder.id, PRICE_PAISE]);
    res.json({ orderId: razorpayOrder.id, amount: PRICE_PAISE, currency: "INR", keyId: process.env.RAZORPAY_KEY_ID });
  } catch (error) { console.error(error); res.status(500).json({ error: "Could not create payment order" }); }
});

async function activateOrder(razorpayOrderId, payment) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(`SELECT * FROM ceg_orders WHERE razorpay_order_id = $1 FOR UPDATE`, [razorpayOrderId]);
    const order = result.rows[0];
    if (!order) throw new Error("Order not found");
    if (order.status === "paid") { await client.query("COMMIT"); return; }
    if (Number(payment.amount) !== PRICE_PAISE || payment.currency !== "INR" || payment.status !== "captured" || payment.order_id !== razorpayOrderId) throw new Error("Payment details do not match");
    await client.query(`INSERT INTO ceg_payments (order_id, razorpay_payment_id, amount) VALUES ($1, $2, $3)`, [order.id, payment.id, payment.amount]);
    await client.query(`UPDATE ceg_orders SET status = 'paid', paid_at = NOW() WHERE id = $1`, [order.id]);
    await client.query(`INSERT INTO ceg_entitlements (user_id, expires_at) VALUES ($1, NOW() + INTERVAL '150 days') ON CONFLICT (user_id) DO UPDATE SET expires_at = GREATEST(ceg_entitlements.expires_at, NOW()) + INTERVAL '150 days', updated_at = NOW()`, [order.user_id]);
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}

app.post("/api/razorpay-webhook", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const expected = crypto.createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET).update(req.body).digest("hex");
    if (!verifySignature(expected, signature)) return res.status(400).send("Invalid webhook signature");
    const event = JSON.parse(req.body.toString());
    if (event.event === "order.paid") { const payment = event.payload?.payment?.entity; if (payment) await activateOrder(payment.order_id, payment); }
    res.json({ received: true });
  } catch (error) { console.error("Webhook error:", error); res.status(500).send("Webhook processing failed"); }
});

app.post("/api/verify-payment", authenticate, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return res.status(400).json({ error: "Payment details missing" });
    const orderResult = await pool.query(`SELECT * FROM ceg_orders WHERE razorpay_order_id = $1 AND user_id = $2`, [razorpay_order_id, req.user.id]);
    if (!orderResult.rows.length) return res.status(404).json({ error: "Order not found" });
    const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex");
    if (!verifySignature(expected, razorpay_signature)) return res.status(400).json({ error: "Invalid payment signature" });
    const payment = await razorpay.payments.fetch(razorpay_payment_id);
    if (payment.order_id !== razorpay_order_id || payment.amount !== PRICE_PAISE || payment.currency !== "INR" || payment.status !== "captured") return res.status(400).json({ error: "Payment is not successfully captured" });
    await activateOrder(razorpay_order_id, payment);
    res.json({ success: true, message: "Payment verified. Paid access activated." });
  } catch (error) { console.error(error); res.status(500).json({ error: "Payment verification failed" }); }
});

app.get("/api/access", authenticate, async (req, res) => {
  try {
    const result = await pool.query(`SELECT expires_at, (expires_at > NOW()) AS active FROM ceg_entitlements WHERE user_id = $1`, [req.user.id]);
    const entitlement = result.rows[0];
    res.json({ active: entitlement ? entitlement.active : false, expiresAt: entitlement ? entitlement.expires_at : null });
  } catch (error) { console.error(error); res.status(500).json({ error: "Could not check access" }); }
});

app.get("/", (req, res) => { res.send("Chhotu Education Group API is running"); });

async function startServer() {
  try { await initializeDatabase(); app.listen(PORT, () => { console.log(`Server running on port ${PORT}`); }); }
  catch (error) { console.error("Server startup failed:", error); process.exit(1); }
}
startServer();