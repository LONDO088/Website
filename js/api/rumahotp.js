// ==================== RUMAH OTP API ====================

const RumahOtpAPI = {
    async getServices() {
        try {
            const response = await fetch(`${CONFIG.rumahOtp.baseUrl}/v2/services`, {
                headers: {
                    'x-apikey': CONFIG.rumahOtp.apiKey,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Gagal mengambil layanan');
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error?.message || 'Gagal');
            }

            return {
                success: true,
                services: data.data
            };

        } catch (error) {
            console.error('RumahOTP Services Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    async getCountries(serviceId) {
        try {
            const response = await fetch(`${CONFIG.rumahOtp.baseUrl}/v2/countries?service_id=${serviceId}`, {
                headers: {
                    'x-apikey': CONFIG.rumahOtp.apiKey,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Gagal mengambil negara');
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error?.message || 'Gagal');
            }

            return {
                success: true,
                countries: data.data
            };

        } catch (error) {
            console.error('RumahOTP Countries Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    async orderNumber(numberId, providerId, operatorId = 1) {
        try {
            const response = await fetch(`${CONFIG.rumahOtp.baseUrl}/v2/orders?number_id=${numberId}&provider_id=${providerId}&operator_id=${operatorId}`, {
                headers: {
                    'x-apikey': CONFIG.rumahOtp.apiKey,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Gagal order nomor');
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error?.message || 'Gagal');
            }

            return {
                success: true,
                orderId: data.data.order_id,
                phoneNumber: data.data.phone_number,
                service: data.data.service,
                expiresIn: data.data.expires_in_minute
            };

        } catch (error) {
            console.error('RumahOTP Order Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    async checkOtp(orderId) {
        try {
            const response = await fetch(`${CONFIG.rumahOtp.baseUrl}/v1/orders/get_status?order_id=${orderId}`, {
                headers: {
                    'x-apikey': CONFIG.rumahOtp.apiKey,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Gagal cek OTP');
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error?.message || 'Gagal');
            }

            return {
                success: true,
                status: data.data.status,
                otpCode: data.data.otp_code
            };

        } catch (error) {
            console.error('RumahOTP Status Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    async cancelOrder(orderId) {
        try {
            const response = await fetch(`${CONFIG.rumahOtp.baseUrl}/v1/orders/set_status?order_id=${orderId}&status=cancel`, {
                headers: {
                    'x-apikey': CONFIG.rumahOtp.apiKey,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Gagal membatalkan order');
            }

            const data = await response.json();

            return {
                success: data.success || false
            };

        } catch (error) {
            console.error('RumahOTP Cancel Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    getFlagEmoji(countryCode) {
        if (!countryCode) return '🌍';
        const codePoints = countryCode
            .toUpperCase()
            .split('')
            .map(char => 127397 + char.charCodeAt());
        return String.fromCodePoint(...codePoints);
    },

    calculatePrice(originalPrice) {
        const profit = CONFIG.profit.nokos;
        const finalPrice = originalPrice + profit;
        
        return {
            originalPrice: originalPrice,
            profit: profit,
            finalPrice: finalPrice
        };
    }
};
