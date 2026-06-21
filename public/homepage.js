/* ════════════════════════════════════
    SUPABASE INITIALIZATION
════════════════════════════════════ */

/* ════════════════════════════════════
    PAGE ROUTING
════════════════════════════════════ */
function showPage(name) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + name).classList.add('active');
    // hide nav on auth pages
    document.getElementById('main-nav').style.display = (name === 'home') ? '' : 'none';
    window.scrollTo(0, 0);
    if (name === 'home') initHome();
}

/* ════════════════════════════════════
    HOME JAVASCRIPT
════════════════════════════════════ */
let homeInited = false;
function initHome() {
    if (homeInited) return;
    homeInited = true;

    /* — Scroll reveal — */
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach((el, i) => {
        el.style.transitionDelay = (i % 4) * 0.08 + 's';
        revealObserver.observe(el);
    });

    /* — Stats counter — */
    const counters = [
        { id: 's1', target: 50, suffix: 'k+', duration: 1800 },
        { id: 's2', target: 200, suffix: '+', duration: 1600 },
        { id: 's3', target: 1, suffix: 'M+', duration: 1400 },
        { id: 's4', target: 47, suffix: '', duration: 1500 },
    ];
    let triggered = false;
    const statsObs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !triggered) {
                triggered = true;
                counters.forEach(c => {
                    const el = document.getElementById(c.id);
                    if (!el) return;
                    let start = 0;
                    const step = c.target / (c.duration / 16);
                    function tick() {
                        start += step;
                        if (start >= c.target) { el.textContent = c.target + c.suffix; return; }
                        el.textContent = Math.floor(start) + c.suffix;
                        requestAnimationFrame(tick);
                    }
                    requestAnimationFrame(tick);
                });
                statsObs.disconnect();
            }
        });
    }, { threshold: 0.4 });
    const statsBar = document.getElementById('stats-bar');
    if (statsBar) statsObs.observe(statsBar);

    /* — Live price ticker — */
    const crops = [
        { name: 'White Maize', price: 'KSh 4,200', change: '+12%', dir: '▲', color: '#16a34a', bg: '#f0fdf4' },
        { name: 'Beans', price: 'KSh 9,500', change: '+5%', dir: '▲', color: '#16a34a', bg: '#f0fdf4' },
        { name: 'Wheat', price: 'KSh 5,800', change: '-3%', dir: '▼', color: '#dc2626', bg: '#fef2f2' },
        { name: 'Irish Potato', price: 'KSh 3,100', change: '+8%', dir: '▲', color: '#16a34a', bg: '#f0fdf4' },
        { name: 'Tomatoes', price: 'KSh 7,400', change: '-1%', dir: '▼', color: '#dc2626', bg: '#fef2f2' },
    ];
    let idx = 0;
    const cropEl = document.querySelector('.price-crop');
    const priceEl = document.querySelector('.price-val');
    const upEl = document.querySelector('.price-up');
    if (cropEl && priceEl && upEl) {
        [cropEl, priceEl, upEl].forEach(el => { if (el) el.style.transition = 'opacity 0.35s'; });
        setInterval(() => {
            idx = (idx + 1) % crops.length;
            const c = crops[idx];
            [cropEl, priceEl, upEl].forEach(el => { if (el) el.style.opacity = '0'; });
            setTimeout(() => {
                if (cropEl) cropEl.textContent = c.name;
                if (priceEl) priceEl.textContent = c.price;
                if (upEl) { upEl.textContent = c.change + ' ' + c.dir; upEl.style.color = c.color; upEl.style.background = c.bg; }
                [cropEl, priceEl, upEl].forEach(el => { if (el) el.style.opacity = '1'; });
            }, 350);
        }, 4000);
    }

    /* — Mobile hamburger — */
    const navInner = document.querySelector('.nav-inner');
    const navLinks = document.getElementById('nav-links');
    if (navInner && navLinks && !document.getElementById('hamburger')) {
        const hb = document.createElement('button');
        hb.id = 'hamburger'; hb.innerHTML = '☰';
        hb.style.cssText = 'display:none;background:none;border:none;font-size:1.5rem;cursor:pointer;color:#374151;padding:0.25rem;';
        const mStyle = document.createElement('style');
        mStyle.textContent = `
  @media(max-width:900px){

    #hamburger{
        display:block !important;
        background:rgba(34,197,94,0.08);
        border:none;
        width:44px;
        height:44px;
        border-radius:12px;
        font-size:1.4rem;
        color:var(--green-700);
        cursor:pointer;
        transition:all 20s ease;
    }

    #hamburger:hover{
        background:var(--green-100);
        transform:scale(1.05);
    }

    #hamburger:active{
        transform:scale(.95);
    }

    .nav-links{
        display:flex;
        flex-direction:column;
        position:fixed;
        top:64px;
        left:0;
        right:0;
        background:rgba(255,255,255,0.98);
        backdrop-filter:blur(12px);
        border-bottom:1px solid #e5e7eb;
        padding:0;
        gap:0;
        box-shadow:0 10px 30px rgba(0,0,0,.12);

        /* Smooth animation */
        max-height:0;
        opacity:0;
        overflow:hidden;
        transform:translateY(-15px);
        transition:
            max-height .4s ease,
            opacity .3s ease,
            transform .3s ease;
    }

    .nav-links.open{
        max-height:350px;
        opacity:1;
        transform:translateY(0);
        padding:1rem;
    }

    .nav-links a{
        display:flex;
        align-items:center;
        padding:14px 16px;
        margin:4px 0;
        border-radius:12px;
        font-weight:600;
        color:var(--gray-700);
        transition:all .25s ease;
    }

    .nav-links a:hover{
        background:var(--green-50);
        color:var(--green-700);
        transform:translateX(6px);
    }

    .nav-links a::before{
        content:'';
        width:4px;
        height:0;
        background:var(--green-600);
        border-radius:999px;
        margin-right:0;
        transition:all .25s ease;
    }

    .nav-links a:hover::before{
        height:18px;
        margin-right:10px;
    }
}`;
        document.head.appendChild(mStyle);
        navInner.insertBefore(hb, document.querySelector('.nav-logo'));
        hb.addEventListener('click', () => {
            navLinks.classList.toggle('open');
            hb.innerHTML = navLinks.classList.contains('open') ? '✕' : '☰';
        });
    }
}

// Init home on first load
initHome();

/* ════════════════════════════════════
    TOAST
════════════════════════════════════ */
function showToast(msg, duration = 3000) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.style.opacity = '1'; t.style.transform = 'translateY(0)';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(16px)'; }, duration);
}

/* ════════════════════════════════════
    PASSWORD HELPERS
════════════════════════════════════ */
function togglePwd(id, btn) {
    const inp = document.getElementById(id);
    if (!inp) return;
    if (inp.type === 'password') { inp.type = 'text'; btn.textContent = '🙈'; }
    else { inp.type = 'password'; btn.textContent = '👁'; }
}

function checkPasswordStrength(val) {
    const fill = document.getElementById('strength-fill');
    const label = document.getElementById('strength-label');
    if (!fill) return;
    let score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;
    const levels = [
        { w: '0%', color: '#e5e7eb', text: 'Enter a password' },
        { w: '25%', color: '#ef4444', text: 'Weak' },
        { w: '50%', color: '#f59e0b', text: 'Fair' },
        { w: '75%', color: '#3b82f6', text: 'Good' },
        { w: '100%', color: '#16a34a', text: 'Strong 💪' },
    ];
    const l = levels[val.length === 0 ? 0 : score];
    fill.style.width = l.w;
    fill.style.background = l.color;
    if (label) {
        label.textContent = val.length === 0 ? 'Enter a password' : l.text;
        label.style.color = l.color;
    }
}

/* ════════════════════════════════════
    FORM VALIDATION
════════════════════════════════════ */
function setFieldState(inputId, errId, valid, errMsg) {
    const inp = document.getElementById(inputId);
    const err = document.getElementById(errId);
    if (!inp) return valid;
    inp.classList.toggle('error', !valid);
    inp.classList.toggle('success', valid);
    if (err) { err.textContent = errMsg || err.textContent; err.classList.toggle('show', !valid); }
    return valid;
}

function validateEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

/* ════════════════════════════════════
    SIGNUP HANDLER (SUPABASEED & SAFE)
════════════════════════════════════ */
/* ════════════════════════════════════
    SIGNUP HANDLER (UPDATED WITH USER TYPE)
════════════════════════════════════ */
async function handleSignup() {
    // 1. Capture the selected User Type (Farmer or Trader)
    // Assumes your active button has an 'active' class. Adjust selector if you use a radio or select dropdown!
    let userType = 'Farmer';
    const activeRoleEl = document.querySelector('.role-btn.active, .user-type-btn.active');
    if (activeRoleEl) {
        userType = activeRoleEl.textContent.includes('Trader') ? 'Trader' : 'Farmer';
    }

    const fname = document.getElementById('su-fname').value.trim();
    const lname = document.getElementById('su-lname').value.trim();
    const email = document.getElementById('su-email').value.trim();
    const phone = document.getElementById('su-phone').value.trim();
    const county = document.getElementById('su-county').value;
    const pass = document.getElementById('su-pass').value;
    const pass2 = document.getElementById('su-pass2').value;

    let ok = true;
    ok = setFieldState('su-fname', 'err-fname', fname.length >= 2, 'Please enter your first name') && ok;
    ok = setFieldState('su-lname', 'err-lname', lname.length >= 2, 'Please enter your last name') && ok;
    ok = setFieldState('su-email', 'err-email', validateEmail(email), 'Please enter a valid email') && ok;
    ok = setFieldState('su-phone', 'err-phone', phone.length >= 9, 'Please enter a valid phone number') && ok;
    ok = setFieldState('su-county', 'err-county', county !== '', 'Please select your county') && ok;
    ok = setFieldState('su-pass', 'err-pass', pass.length >= 8, 'Password must be at least 8 characters') && ok;
    ok = setFieldState('su-pass2', 'err-pass2', pass === pass2, 'Passwords do not match') && ok;

    if (!ok) { showToast('⚠️ Please fix the errors above'); return; }

    const btn = document.getElementById('btn-signup');
    const txt = document.getElementById('signup-btn-text');
    if (btn && txt) {
        btn.disabled = true;
        txt.innerHTML = '<div class="spinner"></div>';
    }

    try {
        // Send all information including the user_type choice to Supabase Auth
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: pass,
            options: {
                data: {
                    user_type: userType,
                    first_name: fname,
                    last_name: lname,
                    phone_number: phone,
                    county: county
                }
            }
        });

        if (error) {
            showToast('❌ ' + error.message);
        } else {
            document.getElementById('success-icon').textContent = '🌱';
            document.getElementById('success-title').textContent = 'Account Created!';
            document.getElementById('success-msg').textContent = `Welcome, ${fname}! You're now part of a 50,000-strong farming community.`;
            document.getElementById('success-overlay').classList.add('show');
        }
    } catch (err) {
        console.error("Signup exception caught:", err);
        showToast('❌ System Error: ' + err.message);
    } finally {
        if (btn && txt) {
            btn.disabled = false;
            txt.textContent = 'Create Account';
        }
    }
}

/* ════════════════════════════════════
    LOGIN HANDLER (SUPABASEED & SAFE)
════════════════════════════════════ */
async function handleLogin() {
    const email = document.getElementById('li-email').value.trim();
    const pass = document.getElementById('li-pass').value;

    let ok = true;
    ok = setFieldState('li-email', 'li-err-email', validateEmail(email), 'Please enter a valid email') && ok;
    ok = setFieldState('li-pass', 'li-err-pass', pass.length >= 6, 'Please enter your password') && ok;

    if (!ok) { showToast('⚠️ Please fill in all fields correctly'); return; }

    const btn = document.getElementById('btn-login');
    const txt = document.getElementById('login-btn-text');
    if (btn && txt) {
        btn.disabled = true;
        txt.innerHTML = '<div class="spinner"></div>';
    }

    try {
        // Call Supabase Authentication using the new safe client variable
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: pass
        });

        if (error) {
            showToast('❌ ' + error.message);
        } else {
            // 1. Fetch the user's first name from metadata for a personalized toast alert
            const userFirstName = data.user?.user_metadata?.first_name || 'User';
            showToast(`👋 Welcome back, ${userFirstName}! Redirecting...`);

            // 2. Redirect instantly to your disease detection dashboard module
            setTimeout(() => {
                window.location.href = 'dash.html';
            }, 800); // minor delay lets the user read the success toast message
        }
    } catch (err) {
        console.error("Login exception caught:", err);
        showToast('❌ System Error: ' + err.message);
    } finally {
        if (btn && txt) {
            btn.disabled = false;
            txt.textContent = 'Sign In';
        }
    }
}

/* ════════════════════════════════════
    GOOGLE AUTH (SUPABASEED & SAFE)
════════════════════════════════════ */
async function handleGoogleAuth(type) {
    showToast('🔄 Connecting to Google…');

    try {
        const { data, error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin // Redirects user back to your site after login
            }
        });

        if (error) {
            showToast('❌ Google Auth failed: ' + error.message);
        }
    } catch (err) {
        console.error("Google Auth Exception:", err);
        showToast('❌ Error: ' + err.message);
    }
}

/* ════════════════════════════════════
    FORGOT PASSWORD (SUPABASEED & SAFE)
════════════════════════════════════ */
async function showForgotToast() {
    const email = document.getElementById('li-email').value.trim();
    if (!validateEmail(email)) {
        showToast('📧 Enter your email above first, then click Forgot Password');
        document.getElementById('li-email').focus();
        return;
    }

    showToast('🔄 Sending reset link...');
    try {
        const { data, error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin,
        });

        if (error) {
            showToast('❌ Failed: ' + error.message);
        } else {
            showToast(`📧 Password reset link sent to ${email}`, 4000);
        }
    } catch (err) {
        console.error("Password reset exception:", err);
        showToast('❌ Error: ' + err.message);
    }
}

/* ════════════════════════════════════
    SUCCESS OVERLAY CLOSE
════════════════════════════════════ */
function closeSuccess() {
    document.getElementById('success-overlay').classList.remove('show');
    showPage('home');
    showToast('✅ You are now signed in!');
}