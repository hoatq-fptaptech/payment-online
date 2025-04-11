const paypal = require("../config/paypal");
const Transaction = require("../models/Transaction");
const { v4: uuidv4 } = require('uuid');
const moment = require("moment");
const config = require("../config/vnpay");
const vnpay_1 = require("vnpay");
const vnpay = new vnpay_1.VNPay({
  secureSecret: process.env.VNP_HASH_SECRET,
  tmnCode: process.env.VNP_TMNCODE,
});
// Paypal
exports.createPayment = async (req, res) => { 
  const { amount } = req.body;

  const create_payment_json = {
    intent: "sale",
    payer: {
      payment_method: "paypal"
    },
    redirect_urls: {
      return_url: "http://localhost:3000/payment/paypal/success",
      cancel_url: "http://localhost:3000/payment/paypal/cancel"
    },
    transactions: [{
      amount: {
        currency: "USD",
        total: amount
      },
      description: "Thanh toán demo với PayPal"
    }]
  };

  paypal.payment.create(create_payment_json, async (error, payment) => {
    if (error) return res.status(500).json(error);

    const transaction = new Transaction({
        amount: amount,
        status: "pending",
        paymentMethod: "paypal",
        paypalPaymentId: payment.id
      });
      await transaction.save();
      

    const approvalUrl = payment.links.find(link => link.rel === 'approval_url').href;
    res.json({ approvalUrl });
  });
};

exports.executePayment = async (req, res) => {
  const { paymentId, PayerID } = req.query;

  const paymentExecution = {
    payer_id: PayerID
  };

  paypal.payment.execute(paymentId, paymentExecution, async (error, payment) => {
    if (error) {
     return res.redirect(`/payment/fail`);
    }

    // Cập nhật giao dịch
    const updated = await Transaction.findOneAndUpdate(
      { paypalPaymentId: paymentId },
      { status: "success" }
    );

    const amount = payment.transactions[0].amount.total;
    const method = payment.payer.payment_method; // 'paypal'

    // Render  trang thành công với query string
    return res.render("success", {
        amount,
        method
      });
  });
};

// VNPay
exports.createVnpayPayment = async (req, res) => {
    // const ipAddr = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const { amount } = req.body;
    const vnp_TxnRef = new Date().getTime().toString()
    const transaction = new Transaction({
      amount,
      status: "pending",
      paymentMethod: "vnpay",
      vnpTxnRef: vnp_TxnRef,
    });
    await transaction.save();

    const data = {
      vnp_Amount: amount * 26000,
      vnp_IpAddr: req.headers.forwarded ||
          req.ip ||
          req.socket.remoteAddress ||
          req.connection.remoteAddress ||
          '127.0.0.1',
      vnp_OrderInfo: "Thanh toan don hang #" + vnp_TxnRef,
      vnp_ReturnUrl: process.env.VNP_RETURN_URL,
      vnp_TxnRef: vnp_TxnRef,
      vnp_BankCode: "NCB",
      vnp_Locale: "vn",
      vnp_OrderType: "other",
    };
    const url = vnpay.buildPaymentUrl(data);
    res.redirect(url)
  };
  
  exports.vnpayReturn = async (req, res) => {
    const {vnp_TxnRef,vnp_Amount,vnp_TransactionStatus} = req.query; 
    // Cập nhật giao dịch
    await Transaction.findOneAndUpdate(
      { vnpTxnRef: vnp_TxnRef },
      { status: vnp_TransactionStatus== "00"?"success":"failed" }
    );
    const verify = vnpay.verifyIpnCall(req.query);
    if (!verify.isVerified || vnp_TransactionStatus !== "00") {
      return res.redirect(`/payment/fail`);
    }
    const amount = vnp_Amount/2600000; // Chia cho 100 để chuyển đổi từ đồng sang tiền tệ thực tế
    const method = 'VNPay'; // 'vnpay'

    // Render  trang thành công với query string
    return res.render("success", {
        amount,
        method
      });
  };
  
  function sortObject(obj) {
    const sorted = {};
    const keys = Object.keys(obj).sort();
    for (const key of keys) sorted[key] = obj[key];
    return sorted;
  }

  // Webhook
  exports.createQrTransaction = async (req, res) => {
    try {
      const { amount } = req.body;
  
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Số tiền không hợp lệ' });
      }
  
      const webhookTxnRef = uuidv4();
  
      const transaction = new Transaction({
        amount,
        paymentMethod: 'qr',
        status: 'pending',
        webhookTxnRef,
      });
   
      await transaction.save();
  
      return res.json({ webhookTxnRef,amount });
    } catch (err) {
      console.log('Lỗi tạo QR transaction:', err);
      return res.status(500).json({ error: 'Không thể tạo giao dịch QR' });
    }
  };
  exports.updateQrTransaction = async (req, res) => {
    const authorizationHeader = req.headers['authorization']; // Lấy header "Authorization"

    if (!authorizationHeader) {
        return res.status(401).json({ message: 'Authorization header is missing' });
    }
    // Kiểm tra header có đúng định dạng "Apikey API_KEY_CUA_BAN"
    const [scheme, apiKey] = authorizationHeader.split(' ');

    if (scheme !== 'Apikey' || !apiKey || apiKey != process.env.SEPAY_APIKEY) {
        return res.status(401).json({ message: 'Invalid Authorization format' });
    }

    const transactionDetail = req.body;
    if (!transactionDetail) {
        return res.status(401).json({ message: 'Transaction detail is missing' });
    }
    if(transactionDetail.transferType == "in"){
        try {
            const amount = transactionDetail.transferAmount;
            let content = transactionDetail.content;
            const [prefix, webhookTxnRef,suffix] = content.split('fptaptech');
            await Transaction.findOneAndUpdate(
              { webhookTxnRef },
              { status: "success",amount }
            );
            res.status(201).send({status:true,message:`Ghi nhận giao dịch thành công`});
        }catch(error){
            res.status(409).json({status:false,error:"Thất bại"});
        }
    }
  }
  exports.checkQrTransaction = async (req, res) => {
      const { webhookTxnRef } = req.query;
      if (!webhookTxnRef) {
          return res.status(400).json({ error: 'webhookTxnRef is required' });
      }
      const transaction = await Transaction.findOne({ webhookTxnRef });
      if(!transaction) {
          return res.status(404).json({ error: 'Transaction not found' });
      }
      const status = transaction.status;
      if (status === 'pending') {
          return res.status(200).json({ status: 'pending' });
      } else if (status === 'success') {
          return res.status(200).json({ status: 'success', amount: transaction.amount });
      } else {
          return res.status(400).json({ status: 'failed' });
      }
  }