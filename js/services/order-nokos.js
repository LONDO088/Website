// ==================== LAYANAN ORDER NOKOS ====================

const NokosService = {
    sessions: {},

    async getServices() {
        try {
            const result = await RumahOtpAPI.getServices();
            return result.success ? result.services : [];
        } catch (error) {
            console.error('Get Services Error:', error);
            return [];
        }
    },

    async getCountries(serviceId) {
        try {
            const result = await RumahOtpAPI.getCountries(serviceId);
            return result.success ? result.countries : [];
        } catch (error) {
            console.error('Get Countries Error:', error);
            return [];
        }
    },

    async processOrder(userId, serviceId, countryId, providerId, operatorId = 1) {
        try {
            const countries = await this.getCountries(serviceId);
            const country = countries.find(c => c.number_id == countryId);
            
            if (!country) {
                throw new Error('Negara tidak ditemukan');
            }

            const pricelist = country.pricelist || [];
            const selectedPrice = pricelist.find(p => p.provider_id == providerId);
            
            if (!selectedPrice) {
                throw new Error('Harga tidak ditemukan');
            }

            const price = RumahOtpAPI.calculatePrice(selectedPrice.price);

            const user = await GitHubAPI.getUserById(userId);
            if (!user || user.balance < price.finalPrice) {
                throw new Error('Saldo tidak cukup');
            }

            await GitHubAPI.updateBalance(userId, -price.finalPrice, 'order_nokos', {
                serviceId: serviceId,
                countryId: countryId,
                countryName: country.name,
                providerId: providerId,
                originalPrice: price.originalPrice,
                profit: price.profit
            });

            const order = await RumahOtpAPI.orderNumber(countryId, providerId, operatorId);
            
            if (!order.success) {
                await GitHubAPI.updateBalance(userId, price.finalPrice, 'refund', {
                    reason: 'Order gagal di Rumah OTP',
                    serviceId: serviceId
                });
                throw new Error(order.error);
            }

            const orderData = {
                userId: userId,
                orderId: order.orderId,
                serviceId: serviceId,
                countryId: countryId,
                countryName: country.name,
                phoneNumber: order.phoneNumber,
                providerId: providerId,
                price: price.finalPrice,
                originalPrice: price.originalPrice,
                profit: price.profit,
                status: 'waiting_otp',
                expiresIn: order.expiresIn,
                createdAt: new Date().toISOString()
            };

            await GitHubAPI.addTransaction({
                userId: userId,
                amount: -price.finalPrice,
                type: 'order_nokos',
                status: 'pending',
                details: orderData
            });

            const sessionId = `order_${order.orderId}`;
            this.sessions[sessionId] = {
                ...orderData,
                expireAt: Date.now() + (order.expiresIn * 60 * 1000),
                checkInterval: null
            };

            this.startOtpChecker(sessionId);

            const userData = await GitHubAPI.getUserById(userId);
            await TelegramAPI.sendNotification('new_order_nokos', {
                userId: userId,
                username: userData?.username,
                firstName: userData?.name,
                country: country.name,
                phone: order.phoneNumber,
                orderId: order.orderId,
                price: price.finalPrice,
                expiresIn: order.expiresIn
            });

            return {
                success: true,
                orderId: order.orderId,
                phoneNumber: order.phoneNumber,
                country: country.name,
                price: price.finalPrice,
                expiresIn: order.expiresIn
            };

        } catch (error) {
            console.error('Nokos Order Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    startOtpChecker(sessionId) {
        const session = this.sessions[sessionId];
        if (!session) return;

        if (session.checkInterval) {
            clearInterval(session.checkInterval);
        }

        session.checkInterval = setInterval(async () => {
            try {
                const currentSession = this.sessions[sessionId];
                if (!currentSession) {
                    clearInterval(session.checkInterval);
                    return;
                }

                if (Date.now() > currentSession.expireAt) {
                    clearInterval(session.checkInterval);
                    currentSession.status = 'expired';
                    delete this.sessions[sessionId];
                    return;
                }

                const result = await RumahOtpAPI.checkOtp(currentSession.orderId);

                if (result.success) {
                    if (result.status === 'received' && result.otpCode) {
                        clearInterval(session.checkInterval);
                        
                        currentSession.status = 'received';
                        currentSession.otpCode = result.otpCode;

                        const user = await GitHubAPI.getUserById(currentSession.userId);
                        await TelegramAPI.sendNotification('otp_received', {
                            userId: currentSession.userId,
                            username: user?.username,
                            firstName: user?.name,
                            country: currentSession.countryName,
                            phone: currentSession.phoneNumber,
                            orderId: currentSession.orderId,
                            otp: result.otpCode,
                            price: currentSession.price
                        });

                        setTimeout(() => {
                            delete this.sessions[sessionId];
                        }, 5 * 60 * 1000);
                    }
                }

            } catch (error) {
                console.error('OTP Checker Error:', error);
            }
        }, 3000);
    },

    getCheapestNumbers(country, limit = 8) {
        if (!country.pricelist || !country.pricelist.length) return [];
        return country.pricelist
            .sort((a, b) => a.price - b.price)
            .slice(0, Math.min(limit, country.pricelist.length));
    }
};
