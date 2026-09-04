const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const multer = require('multer');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';
const sessionSecret = process.env.SESSION_SECRET || (isProduction ? null : 'easyride-development-secret');
if (!sessionSecret) throw new Error('SESSION_SECRET must be set in production');
const reviewKey = process.env.REVIEW_KEY || (isProduction ? null : 'easyride-review-development-key');

const uploadsDir = path.join(__dirname, 'public', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });
const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const allowedImageExt = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const upload = multer({
    storage: multer.diskStorage({
        destination: uploadsDir,
        filename: (req, file, cb) => cb(null, `avatar-${crypto.randomBytes(12).toString('hex')}${path.extname(file.originalname).toLowerCase()}`)
    }),
    limits: { fileSize: 2 * 1024 * 1024, files: 1 },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, allowedImageTypes.has(file.mimetype) && allowedImageExt.has(ext));
    }
});

app.disable('x-powered-by');
app.use((req, res, next) => {
    res.set({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        // Existing pages use inline event handlers and styles; keep them working while
        // restricting external resources to the providers used by the UI.
        'Content-Security-Policy': "default-src 'self'; img-src 'self' data: https://flagcdn.com https://images.unsplash.com; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net",
        'Permissions-Policy': 'geolocation=()'
    });
    next();
});
app.use(express.json({ limit: '100kb' }));

// Small dependency-free rate limiter for authentication and mutations.
const rateBuckets = new Map();
function rateLimit(max, windowMs) {
    return (req, res, next) => {
        const key = `${req.ip}:${req.path}`;
        const now = Date.now();
        const bucket = rateBuckets.get(key);
        if (!bucket || now - bucket.start >= windowMs) rateBuckets.set(key, { start: now, count: 1 });
        else if (++bucket.count > max) return res.status(429).json({ error: 'Too many requests. Please try again later.' });
        next();
    };
}
setInterval(() => {
    const cutoff = Date.now() - 15 * 60 * 1000;
    for (const [key, bucket] of rateBuckets) if (bucket.start < cutoff) rateBuckets.delete(key);
}, 15 * 60 * 1000).unref();

function parseCookies(header) {
    return Object.fromEntries((header || '').split(';').filter(Boolean).map(part => {
        const i = part.indexOf('=');
        return [part.slice(0, i).trim(), decodeURIComponent(part.slice(i + 1).trim())];
    }));
}
function sign(value) {
    return crypto.createHmac('sha256', sessionSecret).update(value).digest('base64url');
}
function createSession(userId) {
    const payload = `${userId}.${Date.now() + 7 * 24 * 60 * 60 * 1000}`;
    return `${Buffer.from(payload).toString('base64url')}.${sign(payload)}`;
}
function sessionUserId(req) {
    const token = parseCookies(req.headers.cookie).easyride_session;
    if (!token) return null;
    const [encoded, signature] = token.split('.');
    if (!encoded || !signature) return null;
    let payload;
    try { payload = Buffer.from(encoded, 'base64url').toString('utf8'); } catch { return null; }
    const expected = sign(payload);
    if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const [id, expiry] = payload.split('.');
    return /^\d+$/.test(id) && Number(expiry) > Date.now() ? Number(id) : null;
}
function setSession(res, userId) {
    res.cookie = `easyride_session=${encodeURIComponent(createSession(userId))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${isProduction ? '; Secure' : ''}`;
    res.set('Set-Cookie', res.cookie);
}
function clearSession(res) {
    res.set('Set-Cookie', `easyride_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isProduction ? '; Secure' : ''}`);
}
async function requireAuth(req, res, next) {
    try {
        const id = sessionUserId(req);
        if (!id) return res.status(401).json({ error: 'Authentication required' });
        db.get('SELECT id, username, email, full_name, phone_number, address, profile_picture, created_at FROM users WHERE id = ?', [id], (err, user) => {
            if (err) return next(err);
            if (!user) return res.status(401).json({ error: 'Authentication required' });
            req.user = user;
            next();
        });
    } catch (err) { next(err); }
}
function validateText(value, max = 200) {
    return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max;
}
function parseDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}
function bookingDates(pickup, returnDate) {
    const start = parseDate(pickup);
    const end = parseDate(returnDate);
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    if (!start || !end || start < today || end < start) return null;
    const days = Math.floor((end - start) / 86400000) + 1;
    return days <= 30 ? { pickup, returnDate, days } : null;
}
function sendDbError(err, next) {
    if (err && err.code === 'SQLITE_CONSTRAINT') return next(Object.assign(new Error('A record with those details already exists.'), { status: 409 }));
    next(err);
}

app.use(async (req, res, next) => {
    try { await db.ready; next(); } catch (err) { next(err); }
});
app.use(express.static(path.join(__dirname, 'public')));
app.post('/api/survey', rateLimit(5, 15 * 60 * 1000), (req, res, next) => {
    const { experience, favorite_feature, improvements, device, respondent_type, name = '', email = '', consent = false, answers = {} } = req.body || {};
    const allowedExperience = new Set(['excellent', 'good', 'okay', 'poor']);
    const allowedFeatures = new Set(['fleet', 'booking', 'pricing', 'support', 'design']);
    const allowedRespondentTypes = new Set(['customer', 'developer', 'business']);
    if (!allowedExperience.has(experience) || !allowedFeatures.has(favorite_feature) ||
        !allowedRespondentTypes.has(respondent_type) || !validateText(improvements, 1000) ||
        !validateText(device, 60) || (name !== '' && !validateText(name, 100)) ||
        (email !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) || consent !== true) {
        return res.status(400).json({ error: 'Please complete all survey fields.' });
    }
    db.run(`INSERT INTO survey_responses
        (experience, favorite_feature, improvements, device, respondent_type, name, email, consent, answers)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [experience, favorite_feature, improvements.trim(), device.trim(), respondent_type, name.trim(), email.trim().toLowerCase(), JSON.stringify(answers)],
        err => err ? next(err) : res.status(201).json({ message: 'Thank you for your feedback.' }));
});
function requireReviewKey(req, res, next) {
    if (!reviewKey || req.get('x-review-key') !== reviewKey) return res.status(401).json({ error: 'Reviewer access required.' });
    next();
}
app.get('/api/reviews/surveys', requireReviewKey, (req, res, next) => {
    db.all('SELECT * FROM survey_responses ORDER BY created_at DESC, id DESC', [], (err, rows) => err ? next(err) : res.json({ responses: rows }));
});
app.patch('/api/reviews/surveys/:id', requireReviewKey, (req, res, next) => {
    const status = req.body && req.body.review_status;
    const notes = req.body && req.body.reviewer_notes;
    if (!['New', 'In review', 'Planned', 'Resolved', 'Not planned'].includes(status) || !validateText(notes, 2000) && notes !== '') {
        return res.status(400).json({ error: 'Invalid review update.' });
    }
    db.run('UPDATE survey_responses SET review_status = ?, reviewer_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, String(notes || '').trim(), req.params.id], function (err) {
            if (err) return next(err);
            if (!this.changes) return res.status(404).json({ error: 'Survey response not found.' });
            res.json({ message: 'Review updated.' });
        });
});
app.get('/my-bookings', (req, res) => res.sendFile(path.join(__dirname, 'public', 'my-bookings.html')));
app.get('/booking', (req, res) => res.sendFile(path.join(__dirname, 'public', 'booking.html')));
app.get('/history', (req, res) => res.redirect('/my-bookings'));
app.get('/profile', (req, res) => res.sendFile(path.join(__dirname, 'public', 'profile.html')));
for (const page of ['terms', 'privacy', 'cookies']) app.get(`/${page}`, (req, res) => res.sendFile(path.join(__dirname, 'public', `${page}.html`)));

app.get('/api/cars', (req, res, next) => db.all('SELECT * FROM cars ORDER BY id', [], (err, rows) => err ? next(err) : res.json({ cars: rows })));
app.get('/api/cars/:id', (req, res, next) => {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: 'Invalid car id' });
    db.get('SELECT * FROM cars WHERE id = ?', [req.params.id], (err, row) => {
        if (err) return next(err); if (!row) return res.status(404).json({ error: 'Car not found' }); res.json(row);
    });
});

app.post('/api/auth/register', rateLimit(10, 15 * 60 * 1000), async (req, res, next) => {
    const { username, email, password } = req.body || {};
    if (!validateText(username, 40) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '') || typeof password !== 'string' || password.length < 8 || password.length > 128) {
        return res.status(400).json({ error: 'Use a valid username, email, and password of 8-128 characters.' });
    }
    try {
        const hash = await bcrypt.hash(password, 12);
        db.run('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username.trim(), email.trim().toLowerCase(), hash], function (err) {
            if (err) return sendDbError(err, next);
            setSession(res, this.lastID);
            res.status(201).json({ message: 'Registration successful', user: { id: this.lastID, username: username.trim(), email: email.trim().toLowerCase() } });
        });
    } catch (err) { next(err); }
});
app.post('/api/auth/login', rateLimit(10, 15 * 60 * 1000), (req, res, next) => {
    const { email, password } = req.body || {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '') || typeof password !== 'string') return res.status(400).json({ error: 'Email and password are required.' });
    db.get('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()], async (err, user) => {
        if (err) return next(err);
        if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: 'Invalid credentials' });
        setSession(res, user.id);
        res.json({ message: 'Login successful', user: { id: user.id, username: user.username, email: user.email, full_name: user.full_name } });
    });
});
app.post('/api/auth/logout', (req, res) => { clearSession(res); res.json({ message: 'Logged out' }); });
app.get('/api/auth/me', requireAuth, (req, res) => res.json({ user: req.user }));
app.post('/api/auth/forgot-password', rateLimit(5, 15 * 60 * 1000), (req, res) => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((req.body || {}).email || '')) return res.status(400).json({ error: 'A valid email is required' });
    res.json({ message: 'If the account exists, a reset link has been sent.' });
});

app.post('/api/bookings', requireAuth, rateLimit(20, 15 * 60 * 1000), (req, res, next) => {
    const body = req.body || {};
    const dates = bookingDates(body.pickup_date, body.return_date);
    const carId = Number(body.car_id);
    const provinces = new Set(['Istanbul', 'Ankara', 'Izmir', 'Antalya', 'Bursa', 'Mugla']);
    const methods = new Set(['Pay at Pickup', 'Credit Card', 'Digital Wallet']);
    if (!dates || !Number.isInteger(carId) || carId < 1 || !provinces.has(body.province) || !methods.has(body.payment_method) ||
        !validateText(body.landmark, 120) || !validateText(body.phone_number, 40)) {
        return res.status(400).json({ error: 'Please provide valid booking details.' });
    }
    db.get('SELECT id, price_per_day FROM cars WHERE id = ?', [carId], (err, car) => {
        if (err) return next(err); if (!car) return res.status(404).json({ error: 'Car not found.' });
        db.get("SELECT id FROM bookings WHERE car_id = ? AND status <> 'Cancelled' AND pickup_date <= ? AND return_date >= ?", [carId, dates.returnDate, dates.pickup], (availabilityErr, conflict) => {
            if (availabilityErr) return next(availabilityErr);
            if (conflict) return res.status(409).json({ error: 'This car is not available for those dates.' });
            const total = Number((dates.days * car.price_per_day).toFixed(2));
            db.run(`INSERT INTO bookings (user_id, car_id, pickup_date, return_date, province, landmark, phone_number, payment_method, total_price, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Confirmed')`,
                [req.user.id, carId, dates.pickup, dates.returnDate, body.province, body.landmark.trim(), body.phone_number.trim(), body.payment_method, total],
                function (insertErr) {
                    if (insertErr) return next(insertErr);
                    res.status(201).json({ message: 'Booking successful!', booking: { id: this.lastID, total_price: total, days: dates.days } });
                });
        });
    });
});
app.get('/api/user/bookings', requireAuth, (req, res, next) => {
    db.all(`SELECT b.*, c.name AS car_name, c.image_url FROM bookings b JOIN cars c ON b.car_id = c.id
        WHERE b.user_id = ? ORDER BY b.created_at DESC, b.id DESC`, [req.user.id], (err, rows) => err ? next(err) : res.json({ bookings: rows }));
});
app.post('/api/cancel-booking', requireAuth, (req, res, next) => {
    const id = Number((req.body || {}).bookingId);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Booking ID is required' });
    db.run("UPDATE bookings SET status = 'Cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ? AND status <> 'Cancelled'", [id, req.user.id], function (err) {
        if (err) return next(err); if (!this.changes) return res.status(404).json({ error: 'Booking not found' }); res.json({ message: 'Booking cancelled successfully' });
    });
});

app.get('/api/user/me', requireAuth, (req, res) => res.json({ user: req.user }));
app.get('/api/user/:id', requireAuth, (req, res) => {
    if (Number(req.params.id) !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    res.json({ user: req.user });
});
app.post('/api/update-profile', requireAuth, (req, res, next) => {
    upload.single('avatar')(req, res, err => {
        if (err) return next(Object.assign(new Error(err.code === 'LIMIT_FILE_SIZE' ? 'Image must be 2 MB or smaller.' : 'Only JPG, PNG, or WebP images are allowed.'), { status: 400 }));
        const { full_name = '', phone_number = '', address = '' } = req.body || {};
        if (!validateText(full_name, 100) && full_name !== '' || !validateText(phone_number, 40) && phone_number !== '' || !validateText(address, 200) && address !== '') {
            if (req.file) fs.unlink(req.file.path, () => {});
            return res.status(400).json({ error: 'Profile fields are invalid.' });
        }
        const picture = req.file ? `/uploads/${req.file.filename}` : req.user.profile_picture;
        db.run('UPDATE users SET full_name = ?, phone_number = ?, address = ?, profile_picture = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [full_name.trim(), phone_number.trim(), address.trim(), picture, req.user.id], function (updateErr) {
            if (updateErr) return sendDbError(updateErr, next);
            res.json({ success: true, message: 'Changes saved!', profile_picture: picture });
        });
    });
});
app.put('/api/user/me/password', requireAuth, async (req, res, next) => {
    const { current_password, new_password } = req.body || {};
    if (typeof current_password !== 'string' || typeof new_password !== 'string' || new_password.length < 8 || new_password.length > 128) return res.status(400).json({ error: 'New password must be 8-128 characters.' });
    db.get('SELECT password FROM users WHERE id = ?', [req.user.id], async (err, user) => {
        if (err) return next(err); if (!user || !(await bcrypt.compare(current_password, user.password))) return res.status(401).json({ error: 'Incorrect current password' });
        try {
            db.run('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [await bcrypt.hash(new_password, 12), req.user.id], updateErr => updateErr ? next(updateErr) : res.json({ message: 'Password updated successfully' }));
        } catch (hashErr) { next(hashErr); }
    });
});

// Central JSON error handler; do not leak SQL or filesystem details.
app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    console.error(err);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Internal server error' });
});

if (require.main === module) app.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));
module.exports = app;
