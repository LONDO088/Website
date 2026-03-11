const express = require('express');
const fs = require('fs').promises;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ==================== PAKASIR CONFIG (BENER) ====================
const PAKASIR = {
    project: process.env.PAKASIR_PROJECT || "londk",
    api_key: process.env.PAKASIR_API_KEY || "HGdIzru2dsvwpcJwIiKE9I7Z1iYoi45Q"
};

console.log('✅ PAKASIR Config:', { 
    project: PAKASIR.project, 
    api_key: PAKASIR.api_key.substring(0, 5) + '...' 
});

// ==================== DATABASE SETUP ====================
const DB_FILES = {
    users: 'users.json',
    orders: 'orders.json',
    deposits: 'deposits.json'
};

// Initialize database
async function initDB() {
    for (const [key, file] of Object.entries(DB_FILES)) {
        try {
            await fs.access(file);
            console.log(`✅ ${file} exists`);
        } catch {
            let initialData = [];
            if (key === 'users') {
                const hashedPassword = await bcrypt.hash('admin123', 10);
                initialData = [{
                    id: uuidv4(),
                    username: 'admin',
                    password: hashedPassword,
                    balance: 999999999,
                    role: 'admin',
                    createdAt: new Date().toISOString()
                }];
            }
            await fs.writeFile(file, JSON.stringify(initialData, null, 2));
            console.log(`✅ ${file} created`);
        }
    }
}
initDB();

// Helper functions
async function readDB(file) {
    try {
        const data = await fs.readFile(file, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading ${file}:`, error);
        return [];
    }
}

async function writeDB(file, data) {
    try {
        await fs.writeFile(file, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`Error writing ${file}:`, error);
        return false;
    }
}

// ==================== JWT MIDDLEWARE ====================
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
}

function isAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin only' });
    }
    next();
}

// ==================== SERVICES DATA ====================
const SERVICES = [
    {
        id: 1,
        category: "instagram_followers",
        name: "Instagram Followers Indonesia [MAX 8K]",
        price: 73000,
        min: 100,
        max: 8000,
        description: "Followers Indonesia | Super HQ | Super Fast",
        speed: "Super Fast"
    },
    {
        id: 2,
        category: "instagram_followers",
        name: "Instagram Followers Indonesia REAL",
        price: 72838,
        min: 100,
        max: 10000,
        description: "Followers REAL Indonesia | MAX 10K",
        speed: "Fast"
    },
    {
        id: 3,
        category: "instagram_likes",
        name: "Instagram Likes [MAX 1M]",
        price: 6388,
        min: 100,
        max: 1000000,
        description: "Likes | 100% Old Accounts | 30 Days Refill",
        speed: "50K/Day"
    },
    {
        id: 4,
        category: "instagram_views",
        name: "Instagram Reel Views [MAX 3M]",
        price: 5023,
        min: 100,
        max: 3000000,
        description: "Reel Views | All Link | Ultrafast",
        speed: "Ultrafast"
    },
    {
        id: 5,
        category: "tiktok_followers",
        name: "TikTok Followers Indonesia",
        price: 85000,
        min: 100,
        max: 50000,
        description: "Followers TikTok Indonesia | REAL",
        speed: "Fast"
    }
];

const CATEGORIES = [
    { id: "instagram_followers", name: "Instagram Followers", icon: "📱" },
    { id: "instagram_likes", name: "Instagram Likes", icon: "❤️" },
    { id: "instagram_views", name: "Instagram Views", icon: "👁️" },
    { id: "tiktok_followers", name: "TikTok Followers", icon: "🎵" }
];

// ==================== API ROUTES ====================

// Test route
app.get('/api/test', (req, res) => {
    res.json({ 
        message: 'API is working!', 
        pakasir: {
            project: PAKASIR.project,
            api_key_set: !!PAKASIR.api_key
        }
    });
});

// Get categories
app.get('/api/categories', (req, res) => {
    res.json(CATEGORIES);
});

// Get services
app.get('/api/services', (req, res) => {
    const { category } = req.query;
    if (category) {
        const filtered = SERVICES.filter(s => s.category === category);
        return res.json(filtered);
    }
    res.json(SERVICES);
});

// Register
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username dan password required' });
        }
        
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password minimal 6 karakter' });
        }
        
        const users = await readDB(DB_FILES.users);
        
        if (users.find(u => u.username === username)) {
            return res.status(400).json({ error: 'Username sudah digunakan' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
            id: uuidv4(),
            username,
            password: hashedPassword,
            balance: 0,
            role: 'user',
            createdAt: new Date().toISOString()
        };
        
        users.push(newUser);
        await writeDB(DB_FILES.users, users);
        
        res.json({ 
            success: true, 
            message: 'Registrasi berhasil! Silakan login.' 
        });
        
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const users = await readDB(DB_FILES.users);
        const user = users.find(u => u.username === username);
        
        if (!user) {
            return res.status(401).json({ error: 'Username tidak ditemukan' });
        }
        
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Password salah' });
        }
        
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({
            success: true,
            token,
            user: {
                username: user.username,
                balance: user.balance,
                role: user.role
            }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get user data
app.get('/api/user', authenticateToken, async (req, res) => {
    try {
        const users = await readDB(DB_FILES.users);
        const user = users.find(u => u.id === req.user.id);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({
            username: user.username,
            balance: user.balance,
            role: user.role
        });
        
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ==================== DEPOSIT PAKASIR - FIXED ====================
app.post('/api/deposit', authenticateToken, async (req, res) => {
    try {
        const { amount } = req.body;
        
        // Validasi
        if (!amount || amount < 10000) {
            return res.status(400).json({ 
                error: 'Minimal deposit Rp 10.000' 
            });
        }
        
        // Generate order ID unik
        const orderId = `INV${Date.now()}_${Math.random().toString(36).substring(7)}`;
        
        // ===== FORMAT PAKASIR YANG BENAR =====
        // Format: https://app.pakasir.com/#/invoice/{project}/{api_key}/{order_id}/{amount}
        const paymentUrl = `https://app.pakasir.com/#/invoice/${PAKASIR.project}/${PAKASIR.api_key}/${orderId}/${amount}`;
        
        console.log('🔗 Payment URL:', paymentUrl);
        
        // Simpan deposit
        const deposit = {
            id: orderId,
            userId: req.user.id,
            username: req.user.username,
            amount: parseInt(amount),
            status: 'pending',
            paymentUrl: paymentUrl,
            createdAt: new Date().toISOString()
        };
        
        const deposits = await readDB(DB_FILES.deposits);
        deposits.push(deposit);
        await writeDB(DB_FILES.deposits, deposits);
        
        res.json({
            success: true,
            orderId: orderId,
            paymentUrl: paymentUrl,
            amount: amount,
            message: 'Scan QRIS untuk membayar'
        });
        
    } catch (error) {
        console.error('❌ Deposit error:', error);
        res.status(500).json({ 
            error: 'Gagal membuat deposit. Coba lagi.' 
        });
    }
});

// ==================== CEK STATUS DEPOSIT ====================
app.get('/api/deposit/status/:orderId', authenticateToken, async (req, res) => {
    try {
        const { orderId } = req.params;
        
        const deposits = await readDB(DB_FILES.deposits);
        const deposit = deposits.find(d => d.id === orderId && d.userId === req.user.id);
        
        if (!deposit) {
            return res.status(404).json({ error: 'Deposit tidak ditemukan' });
        }
        
        // Untuk demo, kita anggap pending
        // Nanti webhook dari Pakasir yang akan update status
        
        res.json({
            orderId: deposit.id,
            status: deposit.status,
            amount: deposit.amount,
            createdAt: deposit.createdAt
        });
        
    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ==================== WEBHOOK PAKASIR ====================
app.post('/api/webhook/pakasir', express.json(), async (req, res) => {
    try {
        const { order_id, status, amount } = req.body;
        
        console.log('📡 Webhook received:', { order_id, status, amount });
        
        const deposits = await readDB(DB_FILES.deposits);
        const depositIndex = deposits.findIndex(d => d.id === order_id);
        
        if (depositIndex !== -1 && status === 'paid') {
            // Update status deposit
            deposits[depositIndex].status = 'success';
            deposits[depositIndex].paidAt = new Date().toISOString();
            
            // Update user balance
            const users = await readDB(DB_FILES.users);
            const userIndex = users.findIndex(u => u.id === deposits[depositIndex].userId);
            
            if (userIndex !== -1) {
                users[userIndex].balance += deposits[depositIndex].amount;
                await writeDB(DB_FILES.users, users);
                console.log(`💰 Balance added for ${users[userIndex].username}`);
            }
            
            await writeDB(DB_FILES.deposits, deposits);
            
            res.json({ 
                success: true, 
                message: 'Deposit processed successfully' 
            });
        } else {
            res.json({ 
                success: false, 
                message: 'Invalid order or status' 
            });
        }
        
    } catch (error) {
        console.error('❌ Webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// ==================== ORDER ====================
app.post('/api/order', authenticateToken, async (req, res) => {
    try {
        const { serviceId, link, quantity } = req.body;
        
        const service = SERVICES.find(s => s.id == serviceId);
        if (!service) {
            return res.status(400).json({ error: 'Layanan tidak ditemukan' });
        }
        
        if (quantity < service.min || (service.max > 0 && quantity > service.max)) {
            return res.status(400).json({ 
                error: `Minimal ${service.min} - Maksimal ${service.max || 'tidak terbatas'}` 
            });
        }
        
        const totalPrice = (service.price * quantity) / 1000;
        
        const users = await readDB(DB_FILES.users);
        const userIndex = users.findIndex(u => u.id === req.user.id);
        
        if (users[userIndex].balance < totalPrice) {
            return res.status(400).json({ error: 'Saldo tidak cukup' });
        }
        
        // Potong saldo
        users[userIndex].balance -= totalPrice;
        
        // Buat order
        const order = {
            id: `ORD${Date.now()}`,
            userId: req.user.id,
            username: req.user.username,
            serviceId: service.id,
            serviceName: service.name,
            link: link,
            quantity: parseInt(quantity),
            price: totalPrice,
            status: 'Pending',
            createdAt: new Date().toISOString()
        };
        
        const orders = await readDB(DB_FILES.orders);
        orders.push(order);
        
        // Simpan perubahan
        await writeDB(DB_FILES.users, users);
        await writeDB(DB_FILES.orders, orders);
        
        res.json({
            success: true,
            order: order,
            newBalance: users[userIndex].balance
        });
        
    } catch (error) {
        console.error('Order error:', error);
        res.status(500).json({ error: 'Gagal membuat order' });
    }
});

// Get user orders
app.get('/api/orders', authenticateToken, async (req, res) => {
    try {
        const orders = await readDB(DB_FILES.orders);
        const userOrders = orders
            .filter(o => o.userId === req.user.id)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        res.json(userOrders);
        
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get user deposits
app.get('/api/deposits', authenticateToken, async (req, res) => {
    try {
        const deposits = await readDB(DB_FILES.deposits);
        const userDeposits = deposits
            .filter(d => d.userId === req.user.id)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        res.json(userDeposits);
        
    } catch (error) {
        console.error('Get deposits error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ==================== ADMIN ROUTES ====================
app.get('/api/admin/users', authenticateToken, isAdmin, async (req, res) => {
    try {
        const users = await readDB(DB_FILES.users);
        const safeUsers = users.map(({ password, ...rest }) => rest);
        res.json(safeUsers);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/admin/orders', authenticateToken, isAdmin, async (req, res) => {
    try {
        const orders = await readDB(DB_FILES.orders);
        res.json(orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/admin/add-balance', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { username, amount } = req.body;
        
        const users = await readDB(DB_FILES.users);
        const userIndex = users.findIndex(u => u.username === username);
        
        if (userIndex === -1) {
            return res.status(404).json({ error: 'User tidak ditemukan' });
        }
        
        users[userIndex].balance += parseInt(amount);
        await writeDB(DB_FILES.users, users);
        
        res.json({ 
            success: true, 
            newBalance: users[userIndex].balance 
        });
        
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/admin/update-order', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { orderId, status } = req.body;
        
        const orders = await readDB(DB_FILES.orders);
        const orderIndex = orders.findIndex(o => o.id === orderId);
        
        if (orderIndex === -1) {
            return res.status(404).json({ error: 'Order tidak ditemukan' });
        }
        
        orders[orderIndex].status = status;
        await writeDB(DB_FILES.orders, orders);
        
        res.json({ success: true });
        
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('\n=================================');
    console.log('🚀 SMM PANEL IS RUNNING!');
    console.log('=================================');
    console.log(`📌 Local: http://localhost:${PORT}`);
    console.log(`📌 Login: http://localhost:${PORT}`);
    console.log(`📌 Admin: admin / admin123`);
    console.log('=================================');
    console.log('✅ PAKASIR CONFIG:');
    console.log(`   - Project: ${PAKASIR.project}`);
    console.log(`   - API Key: ${PAKASIR.api_key.substring(0, 5)}...`);
    console.log('=================================\n');
});
