// ==================== GITHUB DATABASE API ====================

const GitHubAPI = {
    // ==================== BASE METHODS ====================
    
    async getData(fileName) {
        try {
            const url = `https://api.github.com/repos/${CONFIG.github.owner}/${CONFIG.github.repo}/contents/${fileName}`;
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `token ${CONFIG.github.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!response.ok) {
                if (response.status === 404) {
                    return this.getDefaultData(fileName);
                }
                throw new Error(`Gagal mengambil ${fileName}`);
            }

            const data = await response.json();
            const content = atob(data.content);
            return {
                ...JSON.parse(content),
                sha: data.sha
            };
        } catch (error) {
            console.error('GitHub API Error:', error);
            return this.getDefaultData(fileName);
        }
    },

    async saveData(fileName, data) {
        try {
            const url = `https://api.github.com/repos/${CONFIG.github.owner}/${CONFIG.github.repo}/contents/${fileName}`;
            
            const content = btoa(JSON.stringify(data, null, 2));
            
            const body = {
                message: `Update ${fileName} by SUPERMARK PAY`,
                content: content
            };

            if (data.sha) {
                body.sha = data.sha;
            }

            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${CONFIG.github.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            return response.ok;
        } catch (error) {
            console.error('GitHub Save Error:', error);
            return false;
        }
    },

    getDefaultData(fileName) {
        const defaults = {
            'users.json': { users: [] },
            'deposits.json': { deposits: [] },
            'transactions.json': { transactions: [] }
        };
        return defaults[fileName] || {};
    },

    generateId(prefix = 'ID') {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `${prefix}-${timestamp}${random}`.toUpperCase();
    },

    formatDate(isoString) {
        const date = new Date(isoString);
        return date.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // ==================== USERS DATABASE ====================

    async getAllUsers() {
        const data = await this.getData(CONFIG.github.files.users);
        return data.users || [];
    },

    async getUserById(userId) {
        const users = await this.getAllUsers();
        return users.find(u => u.id === userId);
    },

    async getUserByEmail(email) {
        const users = await this.getAllUsers();
        return users.find(u => u.email === email);
    },

    async getUserByUsername(username) {
        const users = await this.getAllUsers();
        return users.find(u => u.username === username);
    },

    async getUserByGoogleId(googleId) {
        const users = await this.getAllUsers();
        return users.find(u => u.googleId === googleId);
    },

    async addUser(userData) {
        const data = await this.getData(CONFIG.github.files.users);
        
        if (!data.users) data.users = [];
        
        // Generate avatar URL
        const avatarStyle = CONFIG.avatar.styles[userData.avatar] || CONFIG.avatar.styles.cowok1;
        const avatarUrl = `${CONFIG.avatar.baseUrl}?${avatarStyle}`;
        
        const newUser = {
            id: this.generateId('USR'),
            ...userData,
            avatarUrl: avatarUrl,
            balance: 5000, // Saldo awal Rp 5.000
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        data.users.push(newUser);
        
        const { sha, ...dataToSave } = data;
        const success = await this.saveData(CONFIG.github.files.users, dataToSave);
        
        return success ? newUser : null;
    },

    async updateUser(userId, updates) {
        const data = await this.getData(CONFIG.github.files.users);
        
        const index = data.users.findIndex(u => u.id === userId);
        if (index === -1) return null;
        
        data.users[index] = { 
            ...data.users[index], 
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        const { sha, ...dataToSave } = data;
        const success = await this.saveData(CONFIG.github.files.users, dataToSave);
        
        return success ? data.users[index] : null;
    },

    // ==================== DEPOSITS DATABASE ====================

    async addDeposit(depositData) {
        const data = await this.getData(CONFIG.github.files.deposits);
        
        if (!data.deposits) data.deposits = [];
        
        const deposit = {
            id: this.generateId('DEP'),
            ...depositData,
            createdAt: new Date().toISOString()
        };
        
        data.deposits.push(deposit);
        
        // Batasi jumlah deposit (simpan 1000 terakhir)
        if (data.deposits.length > 1000) {
            data.deposits = data.deposits.slice(-1000);
        }
        
        const { sha, ...dataToSave } = data;
        const success = await this.saveData(CONFIG.github.files.deposits, dataToSave);
        
        return success ? deposit : null;
    },

    async getUserDeposits(userId, limit = 20) {
        const data = await this.getData(CONFIG.github.files.deposits);
        
        return (data.deposits || [])
            .filter(d => d.userId === userId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, limit);
    },

    async updateDepositStatus(depositId, status, paymentData = {}) {
        const data = await this.getData(CONFIG.github.files.deposits);
        
        const index = data.deposits.findIndex(d => d.id === depositId);
        if (index === -1) return null;
        
        data.deposits[index].status = status;
        data.deposits[index].paidAt = new Date().toISOString();
        data.deposits[index].paymentData = paymentData;
        
        const { sha, ...dataToSave } = data;
        const success = await this.saveData(CONFIG.github.files.deposits, dataToSave);
        
        return success ? data.deposits[index] : null;
    },

    // ==================== TRANSACTIONS DATABASE ====================

    async addTransaction(transactionData) {
        const data = await this.getData(CONFIG.github.files.transactions);
        
        if (!data.transactions) data.transactions = [];
        
        const transaction = {
            id: this.generateId('TRX'),
            ...transactionData,
            createdAt: new Date().toISOString()
        };
        
        data.transactions.push(transaction);
        
        if (data.transactions.length > 1000) {
            data.transactions = data.transactions.slice(-1000);
        }
        
        const { sha, ...dataToSave } = data;
        const success = await this.saveData(CONFIG.github.files.transactions, dataToSave);
        
        return success ? transaction : null;
    },

    async getUserTransactions(userId, limit = 20) {
        const data = await this.getData(CONFIG.github.files.transactions);
        
        return (data.transactions || [])
            .filter(t => t.userId === userId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, limit);
    },

    // ==================== UPDATE BALANCE ====================

    async updateBalance(userId, amount, type, details = {}) {
        // Update user balance
        const userData = await this.getData(CONFIG.github.files.users);
        const userIndex = userData.users.findIndex(u => u.id === userId);
        
        if (userIndex === -1) return null;
        
        const oldBalance = userData.users[userIndex].balance || 0;
        const newBalance = oldBalance + amount;
        
        userData.users[userIndex].balance = newBalance;
        userData.users[userIndex].updatedAt = new Date().toISOString();
        
        const { sha: userSha, ...userDataToSave } = userData;
        const userSaved = await this.saveData(CONFIG.github.files.users, userDataToSave);
        
        if (!userSaved) return null;

        // Catat ke database sesuai tipe
        if (type === 'deposit') {
            const deposit = await this.addDeposit({
                userId: userId,
                amount: amount,
                type: type,
                status: 'completed',
                balanceBefore: oldBalance,
                balanceAfter: newBalance,
                details: details
            });
            
            return { balance: newBalance, record: deposit };
        } else {
            const transaction = await this.addTransaction({
                userId: userId,
                amount: amount,
                type: type,
                status: 'completed',
                balanceBefore: oldBalance,
                balanceAfter: newBalance,
                details: details
            });
            
            return { balance: newBalance, record: transaction };
        }
    },

    // ==================== GET USER HISTORY ====================

    async getUserHistory(userId) {
        const [deposits, transactions] = await Promise.all([
            this.getUserDeposits(userId, 50),
            this.getUserTransactions(userId, 50)
        ]);
        
        const allHistory = [
            ...deposits.map(d => ({ ...d, category: 'deposit' })),
            ...transactions.map(t => ({ ...t, category: 'transaction' }))
        ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        return allHistory;
    }
};
