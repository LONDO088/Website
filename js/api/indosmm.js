// ==================== INDO SMM API ====================

const IndoSmmAPI = {
    async checkBalance() {
        try {
            const formData = new URLSearchParams();
            formData.append('key', CONFIG.indoSmm.apiKey);
            formData.append('action', 'balance');

            const response = await fetch(CONFIG.indoSmm.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error('Gagal cek saldo');
            }

            const data = await response.json();

            return {
                success: true,
                balance: parseFloat(data.balance) || 0
            };

        } catch (error) {
            console.error('IndoSMM Balance Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    async getServices() {
        try {
            const formData = new URLSearchParams();
            formData.append('key', CONFIG.indoSmm.apiKey);
            formData.append('action', 'services');

            const response = await fetch(CONFIG.indoSmm.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error('Gagal mengambil layanan');
            }

            const data = await response.json();

            const services = data.map(s => ({
                id: parseInt(s.id),
                name: s.name,
                category: this.getCategory(s.name),
                type: this.getType(s.name),
                rate: parseFloat(s.rate),
                min: parseInt(s.min) || 100,
                max: parseInt(s.max) || 0,
                description: s.description || ''
            }));

            return {
                success: true,
                services: services
            };

        } catch (error) {
            console.error('IndoSMM Services Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    async createOrder(serviceId, link, quantity) {
        try {
            const formData = new URLSearchParams();
            formData.append('key', CONFIG.indoSmm.apiKey);
            formData.append('action', 'add');
            formData.append('service', serviceId);
            formData.append('link', link);
            formData.append('quantity', quantity);

            const response = await fetch(CONFIG.indoSmm.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error('Gagal membuat order');
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            return {
                success: true,
                orderId: data.order.toString()
            };

        } catch (error) {
            console.error('IndoSMM Order Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    async checkStatus(orderId) {
        try {
            const formData = new URLSearchParams();
            formData.append('key', CONFIG.indoSmm.apiKey);
            formData.append('action', 'status');
            formData.append('order', orderId);

            const response = await fetch(CONFIG.indoSmm.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error('Gagal cek status');
            }

            const data = await response.json();

            return {
                success: true,
                status: data.status || 'Pending',
                startCount: parseInt(data.start_count) || 0,
                remains: parseInt(data.remains) || 0
            };

        } catch (error) {
            console.error('IndoSMM Status Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    getCategory(name) {
        name = name.toLowerCase();
        if (name.includes('instagram')) return 'Instagram';
        if (name.includes('tiktok')) return 'TikTok';
        if (name.includes('youtube')) return 'YouTube';
        if (name.includes('facebook')) return 'Facebook';
        if (name.includes('telegram')) return 'Telegram';
        if (name.includes('whatsapp')) return 'WhatsApp';
        if (name.includes('snackvideo')) return 'Snack Video';
        if (name.includes('shopee')) return 'Shopee';
        return 'Lainnya';
    },

    getType(name) {
        name = name.toLowerCase();
        if (name.includes('followers')) return 'Followers';
        if (name.includes('likes')) return 'Likes';
        if (name.includes('views')) return 'Views';
        if (name.includes('comments')) return 'Comments';
        if (name.includes('shares')) return 'Shares';
        if (name.includes('saves')) return 'Saves';
        if (name.includes('subscribers')) return 'Subscribers';
        if (name.includes('members')) return 'Members';
        return 'Other';
    },

    calculatePrice(rate, quantity) {
        const pricePanel = (rate / 1000) * quantity;
        const profit = Math.floor(pricePanel * CONFIG.profit.smm);
        const finalPrice = Math.ceil(pricePanel + profit);
        
        return {
            pricePanel: Math.ceil(pricePanel),
            profit: profit,
            finalPrice: finalPrice
        };
    }
};
