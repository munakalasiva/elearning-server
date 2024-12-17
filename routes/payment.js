import express from "express";
import Razorpay from "razorpay";
import crypto from "crypto";


const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});

// Create an order
router.post("/order", async (req, res) => {
  try {
    const { amount, currency, receipt } = req.body;

    // Validate input
    if (!amount || !currency || !receipt) {
      return res.status(400).json({ message: "Invalid order details" });
    }

    const options = { amount, currency, receipt };
    const order = await razorpay.orders.create(options);

    if (!order) {
      return res.status(500).json({ message: "Error creating order" });
    }

    res.status(201).json(order);
  } catch (err) {
    console.error("Order creation error:", err);
    res.status(500).json({ message: "Error creating order" });
  }
});

// Validate payment
router.post("/order/validate", async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  try {
    // Validate input
    const { error } = validatePaymentInput(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      return res.status(200).json({
        success: true,
        message: "Payment validation successful",
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
      });
    } else {
      return res.status(400).json({ success: false, message: "Invalid payment signature" });
    }
  } catch (err) {
    console.error("Payment validation error:", err);
    res.status(500).json({ success: false, message: "Error validating payment" });
  }
});

export default router;
