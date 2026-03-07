// ==================== KONFIGURASI API ====================

const CONFIG = {
    // ==================== GITHUB DATABASE ====================
    github: {
        owner: 'LONDO088',
        repo: 'tessss',
        token: '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',
        files: {
            users: 'users.json',
            deposits: 'deposits.json',
            transactions: 'transactions.json'
        }
    },

    // ==================== PAKASIR (QRIS) ====================
    pakasir: {
        project: 'londk',
        apiKey: 'HGdIzru2dsvwpcJwIiKE9I7Z1iYoi45Q',
        baseUrl: 'https://app.pakasir.com',
        endpoints: {
            createQRIS: '/api/transactioncreate/qris',
            checkStatus: '/api/transactiondetail',
            cancel: '/api/transactioncancel'
        }
    },

    // ==================== INDO SMM (SUNTIK SOSMED) ====================
    indoSmm: {
        apiKey: 'c23ced388127424da93ea7ff37624940',
        baseUrl: 'https://indosmm.id/api/v2'
    },

    // ==================== RUMAH OTP (NOKOS) ====================
    rumahOtp: {
        apiKey: 'otp_eeeFzAhhUPpRhzPN',
        baseUrl: 'https://www.rumahotp.com/api'
    },

    // ==================== TELEGRAM NOTIFICATION ====================
    telegram: {
        botToken: '8255233554:AAFgl03r6JbTfwMeTaRpjlEOvsnWjaIUZKs',
        ownerId: '7505137919',
        groupLogId: '-1003737400248'
    },

    // ==================== PROFIT MARGIN ====================
    profit: {
        smm: 0.1,      // 10% untuk suntik sosmed
        nokos: 1000,   // Rp 1.000 per nomor
        panel: 0.1     // 10% untuk panel
    },

    // ==================== AVATAR CONFIG ====================
    avatar: {
        baseUrl: 'https://api.dicebear.com/7.x/avataaars/svg',
        styles: {
            cowok1: 'seed=boy1&gender=male',
            cowok2: 'seed=boy2&gender=male',
            cowok3: 'seed=boy3&gender=male',
            cewek1: 'seed=girl1&gender=female',
            cewek2: 'seed=girl2&gender=female',
            cewek3: 'seed=girl3&gender=female'
        }
    }
};

// Freeze biar ga bisa diubah
Object.freeze(CONFIG);
