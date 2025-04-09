const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(express.json()); // Cho JSON (dùng trong PayPal)
app.use(express.urlencoded({ extended: true })); // Cho form (dùng trong VNPay)

app.set("view engine", "pug");
app.set("views", "./views");
app.use(express.static("public"));



mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"));

app.use("/payment", require("./routes/paymentRoutes"));
// router stripe
const stripeRoutes = require('./routes/stripe.route');
app.use('/stripe', stripeRoutes);

// Route giao diện
app.use("/", require("./routes/uiRoutes"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
