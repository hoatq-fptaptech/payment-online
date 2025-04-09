const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");

router.post("/create", paymentController.createPayment);

// PayPal
router.get("/paypal/success", paymentController.executePayment);
router.get("/paypal/cancel", (req, res) => res.send("Thanh toán bị hủy."));

// VNPay
router.post("/vnpay", paymentController.createVnpayPayment);
router.get("/vnpay_return", paymentController.vnpayReturn);
// Webhook
router.post('/qr-create', paymentController.createQrTransaction);
router.get('/update-transaction-qr', paymentController.updateQrTransaction); // Tự động cập nhật trạng thái giao dịch
router.get('/check-transaction-qr', paymentController.checkQrTransaction); // Kiểm tra trạng thái giao dịch
module.exports = router;
