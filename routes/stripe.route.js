const express = require('express');
const router = express.Router();
const stripeController = require('../controllers/stripe.controller');

router.post('/create', stripeController.createStripePayment);
router.get('/success', stripeController.stripeSuccess);
router.get('/cancel', stripeController.stripeCancel);

module.exports = router;
