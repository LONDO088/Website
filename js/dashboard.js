// ==================== DASHBOARD UTAMA ====================

let currentUser = null;
let paymentPollingInterval = null;

document.addEventListener('DOMContentLoaded', async function() {
    const userJson = sessionStorage.getItem('currentUser');
    if (!userJson) {
        window.location.href = '/login.html';
        return;
    }

    currentUser = JSON.parse(userJson);
    
    updateUserInfo();
    await loadDashboardData();
    setupEventListeners();
});

function updateUserInfo() {
    document.getElementById('welcomeName').textContent = currentUser.name.split(' ')[0];
    document.getElementById('balanceAmount').textContent = formatRupiah(currentUser.balance);
    
    const avatarUrl = currentUser.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.avatar || 'boy1'}`;
    document.getElementById('profileAvatar').src = avatarUrl;
    document.getElementById('dropdownAvatar').src = avatarUrl;
    
    document.getElementById('profileName').textContent = currentUser.name;
    document.getElementById('profileEmail').textContent = currentUser.email;
    
    if (document.getElementById('profileFullName')) {
        document.getElementById('profileFullName').textContent = currentUser.name;
        document.getElementById('profileEmailDetail').textContent = currentUser.email;
        document.getElementById('profileUsername').textContent = currentUser.username || '-';
        document.getElementById('profileId').textContent = currentUser.id;
        document.getElementById('profileAvatarLarge').src = avatarUrl;
        
        if (currentUser.createdAt) {
            document.getElementById('profileJoined').textContent = 
                new Date(currentUser.createdAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                });
        }
    }
    
    updateUserStats();
}

async function updateUserStats() {
    const transactions = await GitHubAPI.getUserTransactions(currentUser.id, 100);
    
    const totalOrders = transactions.filter(t => 
        t.type === 'order_smm' || t.type === 'order_nokos'
    ).length;
    
    const successOrders = transactions.filter(t => 
        (t.type === 'order_smm' || t.type === 'order_nokos') && 
        t.status === 'completed'
    ).length;
    
    document.getElementById('totalOrders').textContent = totalOrders;
    document.getElementById('successOrders').textContent = successOrders;
}

async function loadDashboardData() {
    showLoading();
    try {
        await loadSmmCategories();
        await loadSmmProducts();
        await loadNokosServices();
        await loadUserHistory();
    } catch (error) {
        console.error('Load Dashboard Error:', error);
        showToast('Gagal memuat data', 'error');
    } finally {
        hideLoading();
    }
}

async function loadSmmCategories() {
    const categories = await SMMService.getCategories();
    const grid = document.getElementById('smmCategories');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    categories.forEach(cat => {
        const card = document.createElement('div');
        card.className = 'category-card';
        card.onclick = () => filterSmmByCategory(cat);
        
        let icon = 'fas fa-hashtag';
        if (cat === 'Instagram') icon = 'fab fa-instagram';
        else if (cat === 'TikTok') icon = 'fab fa-tiktok';
        else if (cat === 'YouTube') icon = 'fab fa-youtube';
        else if (cat === 'Facebook') icon = 'fab fa-facebook';
        else if (cat === 'Telegram') icon = 'fab fa-telegram';
        else if (cat === 'WhatsApp') icon = 'fab fa-whatsapp';
        
        card.innerHTML = `<i class="${icon}"></i><span>${cat}</span>`;
        grid.appendChild(card);
    });
}

async function loadSmmProducts(category = null) {
    const grid = document.getElementById('smmProducts');
    if (!grid) return;
    
    let products;
    if (category) {
        products = await SMMService.getProductsByCategory(category);
    } else {
        products = await SMMService.getPopularProducts(8);
    }
    
    grid.innerHTML = '';
    
    products.forEach(p => {
        const price = IndoSmmAPI.calculatePrice(p.rate, 1000);
        
        const card = document.createElement('div');
        card.className = 'product-card';
        card.onclick = () => showOrderModal(p);
        
        card.innerHTML = `
            <div class="product-header">
                <h4>${p.name.substring(0, 40)}${p.name.length > 40 ? '...' : ''}</h4>
                <span class="product-badge">${p.category}</span>
            </div>
            <div class="product-price">${formatRupiah(price.finalPrice)} <small>/1K</small></div>
            <div class="product-meta"><span><i class="fas fa-clock"></i> Instant</span></div>
            <div class="product-footer">
                <span class="min-max">Min ${p.min} - Max ${p.max || '∞'}</span>
                <button class="order-btn" onclick="event.stopPropagation(); showOrderModal(${JSON.stringify(p).replace(/"/g, '&quot;')})">Order</button>
            </div>
        `;
        
        grid.appendChild(card);
    });
}

async function filterSmmByCategory(category) {
    await loadSmmProducts(category);
}

async function loadNokosServices() {
    const services = await NokosService.getServices();
    const grid = document.getElementById('nokosServices');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    services.slice(0, 12).forEach(service => {
        const card = document.createElement('div');
        card.className = 'category-card';
        card.onclick = () => selectNokosService(service);
        
        let icon = 'fas fa-phone-alt';
        if (service.service_name.toLowerCase().includes('whatsapp')) icon = 'fab fa-whatsapp';
        else if (service.service_name.toLowerCase().includes('telegram')) icon = 'fab fa-telegram';
        else if (service.service_name.toLowerCase().includes('gmail')) icon = 'fas fa-envelope';
        else if (service.service_name.toLowerCase().includes('facebook')) icon = 'fab fa-facebook';
        else if (service.service_name.toLowerCase().includes('instagram')) icon = 'fab fa-instagram';
        else if (service.service_name.toLowerCase().includes('shopee')) icon = 'fas fa-shopping-bag';
        
        card.innerHTML = `<i class="${icon}"></i><span>${service.service_name}</span>`;
        grid.appendChild(card);
    });
}

let selectedNokosService = null;
let selectedCountry = null;

async function selectNokosService(service) {
    selectedNokosService = service;
    
    const countries = await NokosService.getCountries(service.service_id);
    
    document.getElementById('countriesSection').style.display = 'block';
    document.getElementById('numbersSection').style.display = 'none';
    
    const grid = document.getElementById('countriesGrid');
    grid.innerHTML = '';
    
    countries.forEach(country => {
        const flag = RumahOtpAPI.getFlagEmoji(country.iso_code);
        const cheapest = NokosService.getCheapestNumbers(country, 1)[0];
        const price = cheapest ? RumahOtpAPI.calculatePrice(cheapest.price) : null;
        
        const card = document.createElement('div');
        card.className = 'country-card';
        card.onclick = () => selectNokosCountry(country);
        
        card.innerHTML = `
            <div class="flag">${flag}</div>
            <div class="name">${country.name}</div>
            ${price ? `<div class="price">${formatRupiah(price.finalPrice)}</div>` : ''}
        `;
        
        grid.appendChild(card);
    });
}

async function selectNokosCountry(country) {
    selectedCountry = country;
    
    const numbers = NokosService.getCheapestNumbers(country, 8);
    
    document.getElementById('numbersSection').style.display = 'block';
    
    const grid = document.getElementById('numbersGrid');
    grid.innerHTML = '';
    
    numbers.forEach(item => {
        const price = RumahOtpAPI.calculatePrice(item.price);
        
        const card = document.createElement('div');
        card.className = 'number-card';
        card.onclick = () => processNokosOrder(item);
        
        card.innerHTML = `
            <div class="number-info">
                <div class="service">${selectedNokosService.service_name}</div>
                <div class="phone">Menunggu order...</div>
            </div>
            <div class="number-price">
                <div class="amount">${formatRupiah(price.finalPrice)}</div>
                <div class="copy"><i class="fas fa-shopping-cart"></i> Order</div>
            </div>
        `;
        
        grid.appendChild(card);
    });
}

async function processNokosOrder(item) {
    const price = RumahOtpAPI.calculatePrice(item.price);
    
    if (currentUser.balance < price.finalPrice) {
        showToast('Saldo tidak cukup! Silakan deposit', 'error');
        showDepositModal();
        return;
    }
    
    if (!confirm(`Order nomor ${selectedNokosService.service_name} untuk ${selectedCountry.name}?\nHarga: ${formatRupiah(price.finalPrice)}`)) {
        return;
    }
    
    showLoading();
    
    try {
        const result = await NokosService.processOrder(
            currentUser.id,
            selectedNokosService.service_id,
            selectedCountry.number_id,
            item.provider_id,
            1
        );
        
        if (result.success) {
            currentUser = await GitHubAPI.getUserById(currentUser.id);
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
            updateUserInfo();
            
            showToast('Order berhasil! Nomor: ' + result.phoneNumber, 'success');
            
            setTimeout(() => {
                alert(`
✅ ORDER BERHASIL!
                    
🌍 Negara: ${result.country}
📱 Nomor: ${result.phoneNumber}
🆔 Order ID: ${result.orderId}
💰 Harga: ${formatRupiah(result.price)}
⏱ Expires: ${result.expiresIn} menit
                    
Tunggu OTP masuk dalam beberapa menit.
                `);
            }, 500);
            
            await selectNokosCountry(selectedCountry);
            await loadUserHistory();
        } else {
            showToast('Gagal: ' + result.error, 'error');
        }
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function loadUserHistory() {
    const history = await GitHubAPI.getUserHistory(currentUser.id);
    const list = document.getElementById('historyList');
    
    if (!list) return;
    
    if (history.length === 0) {
        list.innerHTML = `
            <div class="empty-history">
                <i class="fas fa-inbox"></i>
                <p>Belum ada transaksi</p>
            </div>
        `;
        return;
    }
    
    list.innerHTML = '';
    
    history.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        
        let icon, title, amount, status;
        
        if (item.category === 'deposit') {
            icon = 'fa-wallet';
            title = `Deposit ${formatRupiah(item.amount)}`;
            amount = `+${formatRupiah(item.amount)}`;
            status = item.status;
        } else {
            const details = item.details || {};
            icon = details.type === 'smm' ? 'fa-shopping-bag' : 'fa-phone-alt';
            title = details.serviceName || details.countryName || 'Order';
            amount = formatRupiah(item.amount);
            status = item.status;
        }
        
        div.innerHTML = `
            <div class="history-info">
                <div class="history-icon"><i class="fas ${icon}"></i></div>
                <div class="history-details">
                    <h4>${title}</h4>
                    <p>${GitHubAPI.formatDate(item.createdAt)}</p>
                </div>
            </div>
            <div class="history-status">
                <div class="amount ${item.amount > 0 ? 'text-success' : ''}">${amount}</div>
                <span class="status-badge ${status}">${status === 'completed' ? 'Selesai' : status}</span>
            </div>
        `;
        
        list.appendChild(div);
    });
}

// ==================== ORDER MODAL ====================

let currentProduct = null;

function showOrderModal(product) {
    currentProduct = product;
    
    document.getElementById('orderProductName').value = product.name;
    document.getElementById('orderLink').value = '';
    document.getElementById('orderQuantity').value = '';
    document.getElementById('orderTotal').textContent = 'Rp 0';
    
    document.getElementById('orderModal').classList.add('active');
}

document.getElementById('orderQuantity')?.addEventListener('input', function(e) {
    const qty = parseInt(e.target.value) || 0;
    if (currentProduct && qty >= (currentProduct.min || 100)) {
        const price = IndoSmmAPI.calculatePrice(currentProduct.rate, qty);
        document.getElementById('orderTotal').textContent = formatRupiah(price.finalPrice);
    } else {
        document.getElementById('orderTotal').textContent = 'Rp 0';
    }
});

async function processOrder() {
    const link = document.getElementById('orderLink').value;
    const qty = parseInt(document.getElementById('orderQuantity').value);
    
    if (!link || !qty) {
        showToast('Isi semua form!', 'error');
        return;
    }
    
    if (!link.startsWith('http')) {
        showToast('Link harus diawali https://', 'error');
        return;
    }
    
    if (currentProduct.min && qty < currentProduct.min) {
        showToast(`Jumlah minimal ${currentProduct.min}`, 'error');
        return;
    }
    
    if (currentProduct.max && qty > currentProduct.max) {
        showToast(`Jumlah maksimal ${currentProduct.max}`, 'error');
        return;
    }
    
    const price = IndoSmmAPI.calculatePrice(currentProduct.rate, qty);
    
    if (currentUser.balance < price.finalPrice) {
        showToast('Saldo tidak cukup!', 'error');
        showDepositModal();
        return;
    }
    
    showLoading();
    
    try {
        const result = await SMMService.processOrder(
            currentUser.id,
            currentProduct.id,
            link,
            qty
        );
        
        if (result.success) {
            currentUser = await GitHubAPI.getUserById(currentUser.id);
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
            updateUserInfo();
            
            showToast('Order berhasil diproses!', 'success');
            closeOrderModal();
            await loadUserHistory();
        } else {
            showToast('Gagal: ' + result.error, 'error');
        }
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// ==================== PANEL FUNCTIONS ====================

function showPanelForm() {
    document.getElementById('panelForm').style.display = 'block';
}

function hidePanelForm() {
    document.getElementById('panelForm').style.display = 'none';
}

async function processPanelOrder() {
    const name = document.getElementById('panelName').value.trim();
    const username = document.getElementById('panelUsername').value.trim().toLowerCase();
    
    if (!name || name.length < 3) {
        showToast('Nama minimal 3 karakter!', 'error');
        return;
    }
    
    if (!username || username.length < 3) {
        showToast('Username minimal 3 karakter!', 'error');
        return;
    }
    
    if (!/^[a-z0-9_]+$/.test(username)) {
        showToast('Username hanya boleh huruf kecil, angka, dan underscore!', 'error');
        return;
    }
    
    const price = 4000;
    const profit = Math.floor(price * CONFIG.profit.panel);
    const finalPrice = price + profit;
    
    if (currentUser.balance < finalPrice) {
        showToast('Saldo tidak cukup!', 'error');
        showDepositModal();
        return;
    }
    
    showLoading();
    
    try {
        await GitHubAPI.updateBalance(currentUser.id, -finalPrice, 'order_panel', {
            name: name,
            username: username,
            pricePanel: price,
            profit: profit
        });
        
        const password = Math.random().toString(36).slice(-8) + Math.floor(Math.random() * 100);
        
        currentUser = await GitHubAPI.getUserById(currentUser.id);
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        updateUserInfo();
        
        showToast('Panel berhasil dibuat!', 'success');
        hidePanelForm();
        
        setTimeout(() => {
            alert(`
🎉 AKUN PANEL READY!
                
Link Panel: https://pterodactyle.publicserverr.my.id
Username: ${username}
Password: ${password}
                
Simpan data ini baik-baik!
            `);
        }, 500);
        
        await loadUserHistory();
        
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// ==================== DEPOSIT FUNCTIONS ====================

async function createPayment() {
    const amount = parseInt(document.getElementById('depositAmount').value);
    
    if (isNaN(amount) || amount < 1000) {
        showToast('Minimal deposit Rp 1.000', 'error');
        return;
    }
    
    showLoading();
    
    try {
        const payment = await PakasirAPI.createPayment(amount);
        
        if (!payment.success) {
            throw new Error(payment.error);
        }

        const deposit = await GitHubAPI.addDeposit({
            userId: currentUser.id,
            orderId: payment.orderId,
            amount: amount,
            status: 'pending',
            paymentMethod: 'QRIS',
            qrString: payment.qrString
        });

        if (!deposit) {
            throw new Error('Gagal menyimpan data deposit');
        }

        document.getElementById('qrisImage').src = payment.qrImage;
        document.getElementById('orderIdDisplay').textContent = payment.orderId;
        document.getElementById('qrisContainer').style.display = 'block';
        document.getElementById('createPaymentBtn').style.display = 'none';
        
        sessionStorage.setItem('pendingDeposit', JSON.stringify({
            depositId: deposit.id,
            orderId: payment.orderId,
            amount: amount,
            timestamp: Date.now()
        }));
        
        showToast('QRIS berhasil dibuat!', 'success');
        
        startPaymentPolling(deposit.id, payment.orderId, amount);
        
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function startPaymentPolling(depositId, orderId, amount) {
    if (paymentPollingInterval) {
        clearInterval(paymentPollingInterval);
    }
    
    paymentPollingInterval = setInterval(async () => {
        try {
            const result = await PakasirAPI.checkPayment(orderId, amount);
            
            if (result.success && result.status === 'completed') {
                clearInterval(paymentPollingInterval);
                paymentPollingInterval = null;
                
                await GitHubAPI.updateDepositStatus(depositId, 'completed', result);
                
                const balanceResult = await GitHubAPI.updateBalance(
                    currentUser.id, 
                    amount, 
                    'deposit', 
                    { method: 'QRIS', orderId: orderId, depositId: depositId }
                );
                
                if (balanceResult) {
                    currentUser.balance = balanceResult.balance;
                    sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
                    updateUserInfo();
                    
                    showToast('Pembayaran berhasil! Saldo ditambahkan', 'success');
                    
                    document.getElementById('qrisContainer').style.display = 'none';
                    document.getElementById('createPaymentBtn').style.display = 'block';
                    document.getElementById('depositAmount').value = '';
                    
                    sessionStorage.removeItem('pendingDeposit');
                    closeDepositModal();
                    await loadUserHistory();
                }
            }
        } catch (error) {
            console.error('Payment Polling Error:', error);
        }
    }, 5000);
    
    setTimeout(() => {
        if (paymentPollingInterval) {
            clearInterval(paymentPollingInterval);
            paymentPollingInterval = null;
            
            GitHubAPI.updateDepositStatus(depositId, 'expired', {});
            
            showToast('Waktu pembayaran habis', 'info');
            
            document.getElementById('qrisContainer').style.display = 'none';
            document.getElementById('createPaymentBtn').style.display = 'block';
            sessionStorage.removeItem('pendingDeposit');
        }
    }, 30 * 60 * 1000);
}

async function checkPayment() {
    const orderId = document.getElementById('orderIdDisplay').textContent;
    const pending = JSON.parse(sessionStorage.getItem('pendingDeposit') || '{}');
    
    if (!orderId || !pending.amount) {
        showToast('Data pembayaran tidak ditemukan', 'error');
        return;
    }
    
    showLoading();
    
    try {
        const result = await PakasirAPI.checkPayment(orderId, pending.amount);
        
        if (result.success && result.status === 'completed') {
            await GitHubAPI.updateDepositStatus(pending.depositId, 'completed', result);
            
            const balanceResult = await GitHubAPI.updateBalance(
                currentUser.id, 
                pending.amount, 
                'deposit', 
                { method: 'QRIS', orderId: orderId }
            );
            
            if (balanceResult) {
                currentUser.balance = balanceResult.balance;
                sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
                updateUserInfo();
                
                showToast('Pembayaran berhasil! Saldo ditambahkan', 'success');
                
                document.getElementById('qrisContainer').style.display = 'none';
                document.getElementById('createPaymentBtn').style.display = 'block';
                document.getElementById('depositAmount').value = '';
                sessionStorage.removeItem('pendingDeposit');
                
                closeDepositModal();
                await loadUserHistory();
            }
        } else {
            showToast('Pembayaran belum masuk', 'info');
        }
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// ==================== PROFILE FUNCTIONS ====================

function showProfile() {
    document.getElementById('profileModal').classList.add('active');
    toggleDropdown();
}

function closeProfileModal() {
    document.getElementById('profileModal').classList.remove('active');
}

async function changeAvatar(avatar) {
    const avatarStyle = CONFIG.avatar.styles[avatar];
    const avatarUrl = `${CONFIG.avatar.baseUrl}?${avatarStyle}`;
    
    showLoading();
    
    try {
        await GitHubAPI.updateUser(currentUser.id, {
            avatar: avatar,
            avatarUrl: avatarUrl
        });
        
        currentUser.avatar = avatar;
        currentUser.avatarUrl = avatarUrl;
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        updateUserInfo();
        showToast('Avatar berhasil diubah!', 'success');
        
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// ==================== UTILITY FUNCTIONS ====================

function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    document.querySelectorAll('.tab-section').forEach(section => section.classList.remove('active'));
    document.getElementById(tab + 'Section').classList.add('active');
}

function toggleDropdown() {
    document.getElementById('dropdownMenu').classList.toggle('show');
}

function logout() {
    sessionStorage.clear();
    window.location.href = '/';
}

function showDepositModal() {
    document.getElementById('depositModal').classList.add('active');
    document.getElementById('qrisContainer').style.display = 'none';
    document.getElementById('createPaymentBtn').style.display = 'block';
    document.getElementById('depositAmount').value = '';
}

function closeDepositModal() {
    document.getElementById('depositModal').classList.remove('active');
}

function closeOrderModal() {
    document.getElementById('orderModal').classList.remove('active');
}

function showLoading() {
    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    spinner.id = 'globalSpinner';
    spinner.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999;';
    document.body.appendChild(spinner);
}

function hideLoading() {
    const spinner = document.getElementById('globalSpinner');
    if (spinner) spinner.remove();
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background-color: white;
        color: #2c3e50;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        border-left: 4px solid ${type === 'success' ? '#28a745' : '#dc3545'};
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}" 
               style="color: ${type === 'success' ? '#28a745' : '#dc3545'};"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(angka);
}

function setupEventListeners() {
    document.addEventListener('click', function(event) {
        const dropdown = document.getElementById('dropdownMenu');
        const profileBtn = document.querySelector('.profile-btn');
        
        if (dropdown && dropdown.classList.contains('show') && 
            !dropdown.contains(event.target) && 
            !profileBtn.contains(event.target)) {
            dropdown.classList.remove('show');
        }
    });
    
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
            }
        });
    });
    
    const mobileBtn = document.getElementById('mobileMenuBtn');
    if (mobileBtn) {
        mobileBtn.addEventListener('click', function() {
            document.getElementById('navMenu').classList.toggle('show');
            document.getElementById('navRight').classList.toggle('show');
        });
    }
}

// ==================== STYLES FOR ANIMATIONS ====================

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);
