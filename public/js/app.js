const form = document.getElementById('paymentForm');
const buttons = form.querySelectorAll('button[type="submit"]');
// PAYPAL + VNPAY
buttons.forEach(button => {
button.addEventListener('click', async function (e) {
    e.preventDefault();
    const method = this.dataset.method;
    const amount = document.getElementById('amount').value;

    if (!amount || amount <= 0) {
    alert('Vui lòng nhập số tiền hợp lệ!');
    return;
    }

    if (method === 'paypal') {
    const res = await fetch('/payment/create', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ amount })
    });
    const data = await res.json();
    if (data.approvalUrl) {
        window.location.href = data.approvalUrl;
    } else {
        alert('Không tạo được thanh toán PayPal');
    }
    }

    if (method === 'vnpay') {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/payment/vnpay';
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'amount';
    input.value = amount;
    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
    }

    if (method === 'stripe') {
    alert('Stripe sẽ hỗ trợ sau');
    }
});
});

// Stripe Payment Click
document.querySelector('.btn-stripe').addEventListener('click', async () => {
const amount = document.getElementById('amount').value;
const res = await fetch('/stripe/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount })
});
const data = await res.json();
if (data.url) {
    window.location.href = data.url;
} else {
    alert('Lỗi khi tạo thanh toán Stripe');
}
});

// QR Payment Click
var timer = null;
var checkStatusInterval  = null;
var webhookTxnRef = null;
var wbamount = null;
document.getElementById('qrPayBtn').addEventListener('click', async () => {
    
    document.getElementById('amount').disabled = true; // Hide QR section initially
    document.getElementById('qrPayBtn').disabled = true; // Hide QR section initially
    const qrSection = document.getElementById('qrSection');
    const qrImg = document.getElementById('qrImage');
    const amount = document.getElementById('amount').value;

    if (!amount || parseFloat(amount) <= 0) {
        alert('Vui lòng nhập số tiền hợp lệ trước khi thanh toán.');
        return;
    }

    try {
        const res = await fetch('/payment/qr-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
        });

        const data = await res.json();
        if (!data.webhookTxnRef) throw new Error('Không tạo được QR giao dịch');
        webhookTxnRef = data.webhookTxnRef;
        wbamount = data.amount;
        // QR image
        qrImg.src = `https://qr.sepay.vn/img?acc=01700129503&bank=TPBank&amount=${parseInt(wbamount) * 26000}&des=fpt-aptech${webhookTxnRef}fpt-aptech&template=compact&download=DOWNLOAD`;
        qrSection.style.display = 'block';

        // Circular countdown
        const countdownText = document.getElementById('countdownText');
        const circle = document.getElementById('progressCircle');
        const totalTime = 300; // 5 minutes = 300 seconds
        let timeLeft = totalTime;
        clearInterval(timer); // Clear any existing timer
        const circumference = 2 * Math.PI * 70; // 2πr, r = 70
        circle.style.strokeDasharray = `${circumference}`;
        circle.style.strokeDashoffset = `0`;

        timer = setInterval(() => {
            const minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0');
            const seconds = String(timeLeft % 60).padStart(2, '0');
            countdownText.textContent = `${minutes}:${seconds}`;

            const offset = circumference * (1 - timeLeft / totalTime);
            circle.style.strokeDashoffset = `${offset}`;

            timeLeft--;

            if (timeLeft < 0) {
                clearInterval(timer);
                countdownText.textContent = '00:00';
                circle.style.strokeDashoffset = `${circumference}`;
                clearInterval(checkStatusInterval);
                window.location.href = '/payment/fail';
            }
        }, 1000);    

        checkStatusInterval = setInterval(async () => {
            try {
              const res = await fetch(`/payment/check-transaction-qr?webhookTxnRef=${webhookTxnRef}`);
              const data = await res.json();
        
              if (data.status === 'success') {
                clearInterval(timer);
                clearInterval(checkStatusInterval);
                window.location.href = `/payment/success?amount=${amount}&method=qr`;
              }
            } catch (err) {
              console.error('Lỗi kiểm tra trạng thái QR:', err);
            }
          }, 5000); // mỗi 10 giây
    } catch (error) {
        console.error('QR Error:', error);
        alert('Lỗi tạo giao dịch QR');
    }
    
});
