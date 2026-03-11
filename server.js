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

// ==================== DATABASE SETUP ====================
const DB_FILES = {
    users: 'users.json',
    orders: 'orders.json',
    deposits: 'deposits.json'
};

// Initialize database files
async function initDB() {
    for (const [key, file] of Object.entries(DB_FILES)) {
        try {
            await fs.access(file);
        } catch {
            let initialData = [];
            if (key === 'users') {
                const hashedPassword = await bcrypt.hash('admin123', 10);
                initialData = [{
                    id: 'admin_' + Date.now(),
                    username: 'admin',
                    password: hashedPassword,
                    balance: 999999999,
                    role: 'admin',
                    createdAt: new Date().toISOString()
                }];
            }
            await fs.writeFile(file, JSON.stringify(initialData, null, 2));
        }
    }
}
initDB();

// Helper functions
async function readDB(file) {
    try {
        const data = await fs.readFile(file, 'utf8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

async function writeDB(file, data) {
    await fs.writeFile(file, JSON.stringify(data, null, 2));
}

// ==================== JWT MIDDLEWARE ====================
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(401).json({ error: 'No token' });
    
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
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

// ==================== DATA LAYANAN ====================
const SERVICES = [
    // INSTAGRAM FOLLOWERS INDONESIA
    {
        id: 1,
        category: "instagram_followers",
        name: "Instagram Followers Indonesia [MAX 8K]",
        price: 73000,
        min: 100,
        max: 8000,
        description: "Followers Indonesia | Super HQ | Super Fast | No Refill",
        speed: "Super Fast"
    },
    {
        id: 2,
        category: "instagram_followers",
        name: "Instagram Followers Indonesia REAL [MAX 10K]",
        price: 72838,
        min: 100,
        max: 10000,
        description: "Followers REAL Indonesia | MAX 10K | BETA SERVER",
        speed: "Fast"
    },
    {
        id: 3,
        category: "instagram_followers",
        name: "Instagram Followers Indo BEST SELLER",
        price: 75220,
        min: 100,
        max: 10000,
        description: "Followers Indonesia | REFILL 25 HARI | 20K/DAY",
        speed: "20K/Day"
    },
    {
        id: 4,
        category: "instagram_followers",
        name: "Instagram Followers REAL EXTRA 10%",
        price: 77597,
        min: 100,
        max: 50000,
        description: "Followers Indonesia REAL | EXTRA 10% BONUS",
        speed: "Fast"
    },
    
    // INSTAGRAM LIKES
    {
        id: 5,
        category: "instagram_likes",
        name: "Instagram Likes [MAX 1M] Guaranteed",
        price: 6388,
        min: 100,
        max: 1000000,
        description: "Likes | 100% Old Accounts | Drop 0% | 30 Days Refill",
        speed: "50K/Day"
    },
    {
        id: 6,
        category: "instagram_likes",
        name: "Instagram Likes [MAX 2M]",
        price: 7222,
        min: 100,
        max: 2000000,
        description: "Likes | Real Accounts | Cancel Enable | 30 Days",
        speed: "100K/Day"
    },
    
    // INSTAGRAM VIEWS
    {
        id: 7,
        category: "instagram_views",
        name: "Instagram Reel Views [MAX 3M]",
        price: 5023,
        min: 100,
        max: 3000000,
        description: "Reel Views | All Link | Ultrafast",
        speed: "Ultrafast"
    },
    {
        id: 8,
        category: "instagram_views",
        name: "Instagram Video Views [MAX 100M]",
        price: 5061,
        min: 100,
        max: 100000000,
        description: "Video Views | All Link | Fast",
        speed: "Fast"
    },
    
    // TIKTOK
    {
        id: 9,
        category: "tiktok_followers",
        name: "TikTok Followers Indonesia",
        price: 85000,
        min: 100,
        max: 50000,
        description: "Followers TikTok Indonesia | REAL | Fast",
        speed: "Fast"
    },
    {
        id: 10,
        category: "tiktok_likes",
        name: "TikTok Likes Indonesia",
        price: 45000,
        min: 100,
        max: 100000,
        description: "Likes TikTok Indonesia | REAL | Super Fast",
        speed: "Super Fast"
    },
    {
        id: 11,
        category: "tiktok_views",
        name: "TikTok Views",
        price: 3500,
        min: 1000,
        max: 10000000,
        description: "Views TikTok | Instant | High Quality",
        speed: "Instant"
    },
    
    // YOUTUBE
    {
        id: 12,
        category: "youtube_views",
        name: "YouTube Views Indonesia",
        price: 25000,
        min: 1000,
        max: 1000000,
        description: "Views YouTube Indonesia | REAL | Slow Fill",
        speed: "10K/Day"
    },
    {
        id: 13,
        category: "youtube_subs",
        name: "YouTube Subscribers Indonesia",
        price: 125000,
        min: 100,
        max: 100000,
        description: "Subscribers YouTube Indonesia | REAL | Permanent",
        speed: "1K/Day"
    }
];

const CATEGORIES = [
    { id: "instagram_followers", name: "Instagram Followers", icon: "📱" },
    { id: "instagram_likes", name: "Instagram Likes", icon: "❤️" },
    { id: "instagram_views", name: "Instagram Views", icon: "👁️" },
    { id: "tiktok_followers", name: "TikTok Followers", icon: "🎵" },
    { id: "tiktok_likes", name: "TikTok Likes", icon: "🎵❤️" },
    { id: "tiktok_views", name: "TikTok Views", icon: "🎵👁️" },
    { id: "youtube_views", name: "YouTube Views", icon: "▶️" },
    { id: "youtube_subs", name: "YouTube Subs", icon: "▶️👥" }
];

// ==================== API ROUTES ====================

// GET categories
app.get('/api/categories', (req, res) => {
    res.json(CATEGORIES);
});

// GET services
app.get('/api/services', (req, res) => {
    const { category } = req.query;
    if (category) {
        const filtered = SERVICES.filter(s => s.category === category);
        return res.json(filtered);
    }
    res.json(SERVICES);
});

// GET single service
app.get('/api/services/:id', (req, res) => {
    const service = SERVICES.find(s => s.id == req.params.id);
    if (!service) return res.status(404).json({ error: 'Service not found' });
    res.json(service);
});

// REGISTER
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username dan password required' });
        }
        
        const users = await readDB(DB_FILES.users);
        
        if (users.find(u => u.username === username)) {
            return res.status(400).json({ error: 'Username sudah ada' });
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
        
        res.json({ success: true, message: 'Registrasi berhasil' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// LOGIN
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const users = await readDB(DB_FILES.users);
        const user = users.find(u => u.username === username);
        
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Username/password salah' });
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
        res.status(500).json({ error: 'Server error' });
    }
});

// GET user data
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
        res.status(500).json({ error: 'Server error' });
    }
});

// DEPOSIT
app.post('/api/deposit', authenticateToken, async (req, res) => {
    try {
        const { amount } = req.body;
        
        if (amount < 10000) {
            return res.status(400).json({ error: 'Minimal deposit Rp 10.000' });
        }
        
        const orderId = `INV${Date.now()}${Math.floor(Math.random() * 1000)}`;
        
        // Pakasir URL (ganti dengan URL real nanti)
        const paymentUrl = `https://app.pakasir.com/#/invoice/${orderId}`;
        
        const deposit = {
            id: orderId,
            userId: req.user.id,
            username: req.user.username,
            amount: parseInt(amount),
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        
        const deposits = await readDB(DB_FILES.deposits);
        deposits.push(deposit);
        await writeDB(DB_FILES.deposits, deposits);
        
        res.json({
            success: true,
            orderId,
            paymentUrl,
            amount
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// WEBHOOK Pakasir
app.post('/api/webhook/pakasir', async (req, res) => {
    try {
        const { order_id, status } = req.body;
        
        const deposits = await readDB(DB_FILES.deposits);
        const deposit = deposits.find(d => d.id === order_id);
        
        if (deposit && status === 'paid') {
            deposit.status = 'success';
            
            const users = await readDB(DB_FILES.users);
            const user = users.find(u => u.id === deposit.userId);
            if (user) {
                user.balance += deposit.amount;
            }
            
            await writeDB(DB_FILES.users, users);
            await writeDB(DB_FILES.deposits, deposits);
        }
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// CREATE ORDER
app.post('/api/order', authenticateToken, async (req, res) => {
    try {
        const { serviceId, link, quantity } = req.body;
        
        const service = SERVICES.find(s => s.id == serviceId);
        if (!service) {
            return res.status(400).json({ error: 'Service tidak ditemukan' });
        }
        
        if (quantity < service.min || (service.max > 0 && quantity > service.max)) {
            return res.status(400).json({ error: 'Jumlah tidak sesuai ketentuan' });
        }
        
        const totalPrice = (service.price * quantity) / 1000;
        
        const users = await readDB(DB_FILES.users);
        const user = users.find(u => u.id === req.user.id);
        
        if (user.balance < totalPrice) {
            return res.status(400).json({ error: 'Saldo tidak cukup' });
        }
        
        user.balance -= totalPrice;
        
        const order = {
            id: `ORD${Date.now()}`,
            userId: user.id,
            username: user.username,
            serviceId: service.id,
            serviceName: service.name,
            link,
            quantity: parseInt(quantity),
            price: totalPrice,
            status: 'Processing',
            createdAt: new Date().toISOString()
        };
        
        const orders = await readDB(DB_FILES.orders);
        orders.push(order);
        
        await writeDB(DB_FILES.users, users);
        await writeDB(DB_FILES.orders, orders);
        
        res.json({
            success: true,
            order,
            newBalance: user.balance
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// GET user orders
app.get('/api/orders', authenticateToken, async (req, res) => {
    try {
        const orders = await readDB(DB_FILES.orders);
        const userOrders = orders
            .filter(o => o.userId === req.user.id)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(userOrders);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// GET user deposits
app.get('/api/deposits', authenticateToken, async (req, res) => {
    try {
        const deposits = await readDB(DB_FILES.deposits);
        const userDeposits = deposits
            .filter(d => d.userId === req.user.id)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(userDeposits);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ==================== ADMIN ROUTES ====================

// GET all users (admin)
app.get('/api/admin/users', authenticateToken, isAdmin, async (req, res) => {
    try {
        const users = await readDB(DB_FILES.users);
        const safeUsers = users.map(({ password, ...rest }) => rest);
        res.json(safeUsers);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// GET all orders (admin)
app.get('/api/admin/orders', authenticateToken, isAdmin, async (req, res) => {
    try {
        const orders = await readDB(DB_FILES.orders);
        res.json(orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// GET all deposits (admin)
app.get('/api/admin/deposits', authenticateToken, isAdmin, async (req, res) => {
    try {
        const deposits = await readDB(DB_FILES.deposits);
        res.json(deposits.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ADD balance (admin)
app.post('/api/admin/add-balance', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { username, amount } = req.body;
        
        const users = await readDB(DB_FILES.users);
        const user = users.find(u => u.username === username);
        
        if (!user) {
            return res.status(404).json({ error: 'User tidak ditemukan' });
        }
        
        user.balance += parseInt(amount);
        await writeDB(DB_FILES.users, users);
        
        res.json({ success: true, newBalance: user.balance });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// UPDATE order status (admin)
app.post('/api/admin/update-order', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { orderId, status } = req.body;
        
        const orders = await readDB(DB_FILES.orders);
        const order = orders.find(o => o.id === orderId);
        
        if (!order) {
            return res.status(404).json({ error: 'Order tidak ditemukan' });
        }
        
        order.status = status;
        await writeDB(DB_FILES.orders, orders);
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 SMM Panel running on http://localhost:${PORT}`);
    console.log(`📝 Login admin: admin / admin123`);
});
