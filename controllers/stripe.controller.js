const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Transaction = require('../models/Transaction');

exports.createStripePayment = async (req, res) => {
  const { amount } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: 'Thanh toán đơn hàng' },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `http://localhost:3000/stripe/success?amount=${amount}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `http://localhost:3000/stripe/cancel?session_id={CHECKOUT_SESSION_ID}`
    });

    // Lưu vào DB trạng thái pending
    await Transaction.create({
      amount,
      paymentMethod: 'stripe',
      status: 'pending',
      stripeSessionId: session.id
    });
    console.log('Stripe session_id:', session.id);  
    res.json({ url: session.url });
  } catch (err) {
    console.log('Stripe error:', err);
    res.status(500).send('Lỗi tạo thanh toán Stripe');
  }
};

exports.stripeSuccess = async (req, res) => {
  const { amount,session_id  } = req.query;
  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session && session.payment_status === 'paid') {
      // Update status thành công
      await Transaction.findOneAndUpdate( { stripeSessionId: session_id }, {
        status: 'success'
      });
  
      res.render('success', {
        amount,
        method: 'Stripe'
      });
    }else {
      throw new Error('Payment not successful');
    }
  } catch (err) {
    await Transaction.findOneAndUpdate(
      { stripeSessionId: session_id },
      { status: 'fail' }
    );
    return res.redirect(`/payment/fail`);
  }
  
};

exports.stripeCancel = async (req, res) => {
  const sessionId = req.query.session_id;
  await Transaction.findOneAndUpdate(
    { stripeSessionId: sessionId },
    { status: 'fail' }
  );
  return res.redirect(`/payment/fail`);
};
