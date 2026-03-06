// ==================== LAYANAN ORDER SMM ====================

const SMMService = {
    async processOrder(userId, serviceId, link, quantity) {
        try {
            const services = await IndoSmmAPI.getServices();
            if (!services.success) {
                throw new Error('Gagal mengambil layanan');
            }

            const service = services.services.find(s => s.id === serviceId);
            if (!service) {
                throw new Error('Layanan tidak ditemukan');
            }

            const price = IndoSmmAPI.calculatePrice(service.rate, quantity);

            const user = await GitHubAPI.getUserById(userId);
            if (!user || user.balance < price.finalPrice) {
                throw new Error('Saldo tidak cukup');
            }

            await GitHubAPI.updateBalance(userId, -price.finalPrice, 'order_smm', {
                serviceId: serviceId,
                serviceName: service.name,
                quantity: quantity,
                link: link,
                pricePanel: price.pricePanel,
                profit: price.profit
            });

            const order = await IndoSmmAPI.createOrder(serviceId, link, quantity);
            
            if (!order.success) {
                await GitHubAPI.updateBalance(userId, price.finalPrice, 'refund', {
                    reason: 'Order gagal di Indo SMM',
                    serviceId: serviceId
                });
                throw new Error(order.error);
            }

            await GitHubAPI.addTransaction({
                userId: userId,
                amount: -price.finalPrice,
                type: 'order_smm',
                status: 'pending',
                details: {
                    orderId: order.orderId,
                    serviceId: serviceId,
                    serviceName: service.name,
                    quantity: quantity,
                    link: link
                }
            });

            const userData = await GitHubAPI.getUserById(userId);
            await TelegramAPI.sendNotification('new_order_smm', {
                userId: userId,
                username: userData?.username,
                firstName: userData?.name,
                productName: service.name,
                quantity: quantity,
                link: link,
                price: price.finalPrice
            });

            return {
                success: true,
                orderId: order.orderId,
                serviceName: service.name,
                quantity: quantity,
                price: price.finalPrice
            };

        } catch (error) {
            console.error('SMM Order Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    async getCategories() {
        const services = await IndoSmmAPI.getServices();
        if (!services.success) return [];

        const categories = new Set();
        services.services.forEach(s => categories.add(s.category));
        return Array.from(categories).sort();
    },

    async getProductsByCategory(category) {
        const services = await IndoSmmAPI.getServices();
        if (!services.success) return [];

        return services.services
            .filter(s => s.category === category)
            .sort((a, b) => a.rate - b.rate);
    },

    async getPopularProducts(limit = 8) {
        const services = await IndoSmmAPI.getServices();
        if (!services.success) return [];

        return services.services
            .sort((a, b) => b.id - a.id)
            .slice(0, limit);
    }
};