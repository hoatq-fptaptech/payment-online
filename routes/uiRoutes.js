const express = require("express");
const router = express.Router();

// Trang form nhập tiền và chọn thanh toán
router.get("/", (req, res) => {
  res.render("payment");
});
router.get("/payment/success", (req, res) => {
    const { amount, method } = req.query;
    res.render("success", { amount, method });
  });
  
router.get("/payment/fail", (req, res) => {
    res.render("fail");
  });
  
module.exports = router;
