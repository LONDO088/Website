// ==================== TELEGRAM API ====================

const TelegramAPI = {
    baseUrl: `https://api.telegram.org/bot${CONFIG.telegram.botToken}`,

    async sendMessage(chatId, text, options = {}) {
        try {
            const response = await fetch(`${this.baseUrl}/sendMessage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: text,
                    parse_mode: options.parseMode || 'HTML',
                    reply_markup: options.replyMarkup
                })
            });

            return await response.json();
        } catch (error) {
            console.error('Telegram Send Error:', error);
            return { ok: false };
        }
    },

    async sendNotification(type, data) {
        let message = '';
        
        switch(type) {
            case 'new_order_smm':
                message = `
🆕 <b>ORDER SMM BARU</b>

👤 User: ${data.username || data.firstName} (${data.userId})
📦 Produk: ${data.productName}
🔢 Jumlah: ${data.quantity}
🔗 Link: ${data.link}
💰 Harga: ${this.formatRupiah(data.price)}
📅 Waktu: ${new Date().toLocaleString('id-ID')}
                `;
                break;

            case 'new_order_nokos':
                message = `
🆕 <b>ORDER NOKOS BARU</b>

👤 User: ${data.username || data.firstName} (${data.userId})
🌍 Negara: ${data.country}
📱 Nomor: <code>${data.phone}</code>
🆔 Order ID: <code>${data.orderId}</code>
💰 Harga: ${this.formatRupiah(data.price)}
⏱ Expires: ${data.expiresIn} menit
📅 Waktu: ${new Date().toLocaleString('id-ID')}
                `;
                break;

            case 'otp_received':
                message = `
✅ <b>OTP DITERIMA</b>

👤 User: ${data.username || data.firstName} (${data.userId})
🌍 Negara: ${data.country}
📱 Nomor: <code>${data.phone}</code>
🆔 Order ID: <code>${data.orderId}</code>
🔐 OTP: <b>${data.otp}</b>
📅 Waktu: ${new Date().toLocaleString('id-ID')}
                `;
                break;

            case 'deposit':
                message = `
💰 <b>DEPOSIT MASUK</b>

👤 User: ${data.username || data.firstName} (${data.userId})
💳 Jumlah: +${this.formatRupiah(data.amount)}
🆔 Invoice: ${data.invoiceId}
📅 Waktu: ${new Date().toLocaleString('id-ID')}
                `;
                break;
        }

        if (message) {
            return await this.sendMessage(CONFIG.telegram.groupLogId, message);
        }
    },

    formatRupiah(angka) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(angka);
    }
};
