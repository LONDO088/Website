// ==================== PAKASIR API ====================

const PakasirAPI = {
    async createPayment(amount, orderId = null) {
        try {
            if (!orderId) {
                orderId = 'INV-' + Math.random().toString(36).substring(2, 10).toUpperCase();
            }

            const response = await fetch(CONFIG.pakasir.baseUrl + CONFIG.pakasir.endpoints.createQRIS, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    project: CONFIG.pakasir.project,
                    order_id: orderId,
                    amount: amount,
                    api_key: CONFIG.pakasir.apiKey
                })
            });

            if (!response.ok) {
                throw new Error('Gagal membuat pembayaran');
            }

            const data = await response.json();
            
            if (!data.payment) {
                throw new Error('Response tidak valid');
            }

            const qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(data.payment.payment_number)}`;

            return {
                success: true,
                orderId: data.payment.order_id || orderId,
                amount: data.payment.amount,
                qrString: data.payment.payment_number,
                qrImage: qrImage,
                expiredAt: data.payment.expired_at
            };

        } catch (error) {
            console.error('Pakasir Create Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    async checkPayment(orderId, amount) {
        try {
            const url = `${CONFIG.pakasir.baseUrl}${CONFIG.pakasir.endpoints.checkStatus}?project=${CONFIG.pakasir.project}&order_id=${orderId}&amount=${amount}&api_key=${CONFIG.pakasir.apiKey}`;
            
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error('Gagal cek status');
            }

            const data = await response.json();

            return {
                success: true,
                status: data.transaction?.status || 'pending',
                completedAt: data.transaction?.completed_at,
                paymentMethod: data.transaction?.payment_method
            };

        } catch (error) {
            console.error('Pakasir Check Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    async cancelPayment(orderId, amount) {
        try {
            const response = await fetch(CONFIG.pakasir.baseUrl + CONFIG.pakasir.endpoints.cancel, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    project: CONFIG.pakasir.project,
                    order_id: orderId,
                    amount: amount,
                    api_key: CONFIG.pakasir.apiKey
                })
            });

            if (!response.ok) {
                throw new Error('Gagal membatalkan transaksi');
            }

            const data = await response.json();

            return {
                success: true
            };

        } catch (error) {
            console.error('Pakasir Cancel Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
};
