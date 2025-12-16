const midtransClient = require('midtrans-client');

// GANTI BAGIAN INI: Pakai module.exports agar tidak error
module.exports = async (req, res) => {
  // --- KONFIGURASI MIDTRANS ---
  // Pastikan Server Key ini benar (dari Dashboard Midtrans > Settings > Access Keys)
  const SERVER_KEY = process.env.MIDTRANS_SERVER_KEY;

  // Inisialisasi Snap Client
  let snap = new midtransClient.Snap({
    isProduction: false,
    serverKey: SERVER_KEY
  });

  if (req.method === 'POST') {
    try {
      const { id, productName, price } = req.body;

      let parameter = {
        "transaction_details": {
          "order_id": id,
          "gross_amount": price
        },
        "credit_card": {
          "secure": true
        },
        "item_details": [{
            "id": "PRO-SUBS",
            "price": price,
            "quantity": 1,
            "name": productName
        }],
        "customer_details": {
            "first_name": "Tasking",
            "last_name": "User",
            "email": "user@tasking.app",
        }
      };

      const transaction = await snap.createTransaction(parameter);
      res.status(200).json({ token: transaction.token });

    } catch (error) {
      console.error("Midtrans Error:", error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}