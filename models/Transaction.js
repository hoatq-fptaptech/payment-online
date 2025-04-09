// models/Transaction.js
const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ["pending", "success", "failed"],
    default: "pending"
  },
  paymentMethod: {
    type: String, // ví dụ: 'paypal', 'stripe', 'vnpay', 'momo'
    enum: ["paypal", "vnpay", "stripe","qr"],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  paypalPaymentId: String, // chỉ khi là paypal
  stripeSessionId: String, // chỉ khi là stripe
  vnpTxnRef: String,       // chỉ khi là vnpay
  webhookTxnRef: String, // dùng cho QR
  // bạn có thể thêm các trường khác tùy theo cổng thanh toán
});

module.exports = mongoose.model("Transaction", transactionSchema);
