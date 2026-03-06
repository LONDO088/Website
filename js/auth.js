// ==================== AUTHENTICATION ====================

// Google Sign-In
function onGoogleSignIn(googleUser) {
    const profile = googleUser.getBasicProfile();
    
    const googleData = {
        googleId: profile.getId(),
        name: profile.getName(),
        email: profile.getEmail(),
        avatar: Math.random() > 0.5 ? 'cowok1' : 'cewek1'
    };
    
    handleGoogleAuth(googleData);
}

async function handleGoogleAuth(googleData) {
    showLoading(document.querySelector('.g-signin2'));
    
    try {
        let user = await GitHubAPI.getUserByGoogleId(googleData.googleId);
        
        if (!user) {
            user = await GitHubAPI.getUserByEmail(googleData.email);
            
            if (user) {
                user = await GitHubAPI.updateUser(user.id, {
                    googleId: googleData.googleId,
                    avatar: googleData.avatar
                });
            } else {
                user = await GitHubAPI.addUser({
                    name: googleData.name,
                    email: googleData.email,
                    username: googleData.email.split('@')[0] + Math.floor(Math.random() * 1000),
                    googleId: googleData.googleId,
                    avatar: googleData.avatar,
                    balance: 5000
                });
            }
        }
        
        if (user) {
            sessionStorage.setItem('currentUser', JSON.stringify(user));
            showAlert('Login berhasil!', 'success');
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 1500);
        } else {
            throw new Error('Gagal membuat/mendapatkan user');
        }
        
    } catch (error) {
        showAlert('Error: ' + error.message, 'error');
    } finally {
        hideLoading(document.querySelector('.g-signin2'));
    }
}

// Register Manual
document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const username = document.getElementById('username').value.trim().toLowerCase();
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const avatar = document.getElementById('avatar')?.value || 'cowok1';
            
            // Validasi
            if (password !== confirmPassword) {
                showAlert('Password tidak cocok!', 'error');
                return;
            }
            
            if (password.length < 6) {
                showAlert('Password minimal 6 karakter!', 'error');
                return;
            }
            
            if (!/^[a-z0-9_]+$/.test(username)) {
                showAlert('Username hanya boleh huruf kecil, angka, dan underscore!', 'error');
                return;
            }
            
            if (!isValidEmail(email)) {
                showAlert('Email tidak valid!', 'error');
                return;
            }
            
            const submitBtn = registerForm.querySelector('button[type="submit"]');
            showLoading(submitBtn);
            
            try {
                const existingEmail = await GitHubAPI.getUserByEmail(email);
                if (existingEmail) {
                    hideLoading(submitBtn);
                    showAlert('Email sudah terdaftar!', 'error');
                    return;
                }
                
                const existingUsername = await GitHubAPI.getUserByUsername(username);
                if (existingUsername) {
                    hideLoading(submitBtn);
                    showAlert('Username sudah digunakan!', 'error');
                    return;
                }
                
                const newUser = await GitHubAPI.addUser({
                    name: name,
                    email: email,
                    username: username,
                    password: hashPassword(password),
                    avatar: avatar,
                    balance: 5000
                });
                
                if (newUser) {
                    sessionStorage.setItem('currentUser', JSON.stringify(newUser));
                    showAlert('Pendaftaran berhasil!', 'success');
                    setTimeout(() => {
                        window.location.href = '/dashboard.html';
                    }, 1500);
                } else {
                    throw new Error('Gagal menyimpan data');
                }
                
            } catch (error) {
                showAlert('Error: ' + error.message, 'error');
            } finally {
                hideLoading(submitBtn);
            }
        });
    }
    
    // Login Manual
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            
            if (!email || !password) {
                showAlert('Email/Username dan password harus diisi!', 'error');
                return;
            }
            
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            showLoading(submitBtn);
            
            try {
                const users = await GitHubAPI.getAllUsers();
                const user = users.find(u => 
                    (u.email === email || u.username === email) && 
                    u.password === hashPassword(password)
                );
                
                if (!user) {
                    hideLoading(submitBtn);
                    showAlert('Email/Username atau password salah!', 'error');
                    return;
                }
                
                sessionStorage.setItem('currentUser', JSON.stringify(user));
                showAlert('Login berhasil!', 'success');
                setTimeout(() => {
                    window.location.href = '/dashboard.html';
                }, 1500);
                
            } catch (error) {
                showAlert('Error: ' + error.message, 'error');
            } finally {
                hideLoading(submitBtn);
            }
        });
    }
});

// ==================== HELPER FUNCTIONS ====================

function selectAvatar(avatar) {
    document.querySelectorAll('.avatar-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');
    document.getElementById('avatar').value = avatar;
}

function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function hashPassword(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(36);
}

function showAlert(message, type = 'error') {
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) existingAlert.remove();
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    
    const icon = document.createElement('i');
    icon.className = type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle';
    
    alertDiv.appendChild(icon);
    alertDiv.appendChild(document.createTextNode(message));
    
    const form = document.querySelector('.auth-form, .google-login');
    if (form) form.parentNode.insertBefore(alertDiv, form);
    
    if (type === 'success') {
        setTimeout(() => alertDiv.remove(), 5000);
    }
}

function showLoading(element) {
    if (element) {
        element.classList.add('loading');
        element.disabled = true;
    }
}

function hideLoading(element) {
    if (element) {
        element.classList.remove('loading');
        element.disabled = false;
    }
            }
