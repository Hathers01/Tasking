const midtransClient = require('midtrans-client');

export default async function handler(req, res) {
  // --- KONFIGURASI MIDTRANS ---
  // Ganti string di bawah ini dengan Server Key dari Midtrans Dashboard > Settings > Access Keys
  const SERVER_KEY = "Mid-server-zg4SXyN98sZhCQS_-UHiXOfb"; 

  // Inisialisasi Snap Client
  let snap = new midtransClient.Snap({
    isProduction: false, // Ubah ke true jika sudah live production
    serverKey: SERVER_KEY
  });

  if (req.method === 'POST') {
    try {
      const { id, productName, price, quantity } = req.body;

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
        // Data pelanggan dummy (bisa disesuaikan jika ada form login)
        "customer_details": {
            "first_name": "Tasking",
            "last_name": "User",
            "email": "user@tasking.app",
        }
      };

      const transaction = await snap.createTransaction(parameter);
      
      // Kirim token kembali ke Frontend (HTML)
      res.status(200).json({ token: transaction.token });

    } catch (error) {
      console.error("Midtrans Error:", error);
      res.status(500).json({ error: error.message });
    }
  } else {
    // Handle method selain POST
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}