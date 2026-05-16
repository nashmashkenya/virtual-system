import { Router, type IRouter } from "express";
import { randomBytes } from "crypto";

const router: IRouter = Router();

/* ─────────────────────────────────────────────────────────────
   GET /api/payments/summary/
───────────────────────────────────────────────────────────── */
router.get("/payments/summary/", (_req, res) => {
  res.json({
    course_name: "Data Analytics Bootcamp",
    plan: "Monthly live access",
    price: "KSh 3,500",
    status: "awaiting_payment",
    cta: "Pay with M-Pesa",
  });
});

/* ─────────────────────────────────────────────────────────────
   POST /api/payments/simulate
───────────────────────────────────────────────────────────── */
router.post("/payments/simulate", (req, res) => {
  const { phone_number, course_name } = req.body as { phone_number?: string; course_name?: string };
  if (!phone_number || !course_name) {
    return res.status(400).json({ message: "Phone number and course name are required." });
  }
  const ref = `EP${randomBytes(4).toString("hex").toUpperCase()}`;
  res.json({
    message: "Payment processed successfully.",
    status: "success",
    transaction_reference: ref,
    phone_number,
    course_name,
  });
});

export default router;
