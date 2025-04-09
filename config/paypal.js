const paypal = require("paypal-rest-sdk");
require("dotenv").config();

paypal.configure({
  mode: "sandbox", // hoặc 'live' khi dùng thật
  client_id: process.env.PAYPAL_CLIENT_ID,
  client_secret: process.env.PAYPAL_CLIENT_SECRET
});

module.exports = paypal;
