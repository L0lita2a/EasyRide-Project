// server.js
// Main application file
const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const multer = require('multer');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `avatar-${Date.now()}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed.'));
        }
        cb(null, true);
    }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/my-bookings', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'my-bookings.html')));
app.get('/booking', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'booking.html')));
app.get('/history', (_req, res) => res.redirect('/my-bookings'));
app.get('/terms', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'terms.html')));
app.get('/privacy', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'privacy.html')));
app.get('/cookies', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'cookies.html')));
app.get('/profile', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'profile.html')));
app.get('/payment-methods', (_req, res) => res.redirect('/profile#payment'));
app.get('/settings', (_req, res) => res.redirect('/profile#security'));

function publicUser(user) {
    return {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name || '',
        phone_number: user.phone_number || '',
        address: user.address || '',
        profile_picture: user.profile_picture || ''
    };
}

function isValidDate(value) {
    const date = new Date(value);
    return value && !Number.isNaN(date.getTime());
}

app.get('/api/cars', (_req, res) => {
    db.all('SELECT * FROM cars ORDER BY id ASC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ cars: rows });
    });
});

app.get('/api/cars/:id', (req, res) => {
    db.get('SELECT * FROM cars WHERE id = ?', [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Car not found' });
        res.json(row);
    });
});

app.post('/api/auth/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'All fields are required.' });
    }
    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run(
            `INSERT INTO users (username, email, password, full_name) VALUES (?, ?, ?, ?)`,
            [username.trim(), email.trim().toLowerCase(), hashedPassword, username.trim()],
            function (err) {
                if (err) return res.status(400).json({ error: 'Username or email already exists.' });
                res.status(201).json({
                    message: 'Registration successful',
                    user: { id: this.lastID, username, email, full_name: username, phone_number: '', address: '', profile_picture: '' }
                });
            }
        );
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

    db.get('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()], async (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(401).json({ error: 'Invalid email or password.' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid email or password.' });

        res.json({ message: 'Login successful', user: publicUser(user) });
    });
});

app.post('/api/auth/logout', (_req, res) => {
    res.json({ message: 'Logged out successfully' });
});

app.post('/api/auth/forgot-password', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });
    res.json({ message: 'If this email exists, a reset link would be sent.' });
});

app.get('/logout', (_req, res) => {
    res.send(`<script>localStorage.removeItem('easyride_user'); window.location.href='/';</script>`);
});

app.post('/api/bookings', (req, res) => {
    const { user_id, car_id, pickup_date, return_date, province, landmark, phone_number, payment_method } = req.body;

    if (!user_id || !car_id || !pickup_date || !return_date || !province || !landmark || !phone_number || !payment_method) {
        return res.status(400).json({ error: 'All fields are required.' });
    }
    if (!isValidDate(pickup_date) || !isValidDate(return_date)) {
        return res.status(400).json({ error: 'Invalid booking dates.' });
    }

    const pickup = new Date(pickup_date);
    const returnD = new Date(return_date);
    if (returnD < pickup) {
        return res.status(400).json({ error: 'Return date cannot be before pickup date.' });
    }

    db.get('SELECT price_per_day FROM cars WHERE id = ?', [car_id], (err, car) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!car) return res.status(404).json({ error: 'Car not found.' });

        const diffTime = returnD.getTime() - pickup.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        const total_price = Number((diffDays * car.price_per_day).toFixed(2));

        const sql = `
            INSERT INTO bookings
            (user_id, car_id, pickup_date, return_date, province, landmark, phone_number, payment_method, total_price, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Confirmed')
        `;

        db.run(sql, [user_id, car_id, pickup_date, return_date, province, landmark, phone_number, payment_method, total_price], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({
                message: 'Booking successful!',
                booking: { id: this.lastID, total_price, days: diffDays, status: 'Confirmed' }
            });
        });
    });
});

app.get('/api/user/bookings', (req, res) => {
    const user_id = req.query.user_id;
    if (!user_id) return res.status(400).json({ error: 'User ID is required.' });

    const sql = `
        SELECT b.*, c.name as car_name, c.image_url
        FROM bookings b
        JOIN cars c ON b.car_id = c.id
        WHERE b.user_id = ?
        ORDER BY b.id DESC
    `;
    db.all(sql, [user_id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ bookings: rows });
    });
});

app.post('/api/cancel-booking', (req, res) => {
    const { bookingId, user_id } = req.body;
    if (!bookingId) return res.status(400).json({ error: 'Booking ID is required.' });

    const params = user_id ? [bookingId, user_id] : [bookingId];
    const sql = user_id
        ? "UPDATE bookings SET status = 'Cancelled' WHERE id = ? AND user_id = ?"
        : "UPDATE bookings SET status = 'Cancelled' WHERE id = ?";

    db.run(sql, params, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Booking not found.' });
        res.json({ message: 'Booking cancelled successfully' });
    });
});

app.get('/api/user/:id', (req, res) => {
    db.get('SELECT id, username, email, full_name, phone_number, address, profile_picture FROM users WHERE id = ?', [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'User not found' });
        res.json({ user: row });
    });
});

app.post('/api/update-profile', upload.single('avatar'), (req, res) => {
    const user_id = req.body.user_id;
    const { full_name = '', email = '', phone_number = '', address = '' } = req.body;

    if (!user_id) return res.status(400).json({ success: false, error: 'User ID is required.' });
    if (!email) return res.status(400).json({ success: false, error: 'Email is required.' });

    const profilePicture = req.file ? `/uploads/${req.file.filename}` : null;
    const sql = profilePicture
        ? `UPDATE users SET full_name = ?, email = ?, phone_number = ?, address = ?, profile_picture = ? WHERE id = ?`
        : `UPDATE users SET full_name = ?, email = ?, phone_number = ?, address = ? WHERE id = ?`;
    const params = profilePicture
        ? [full_name, email.trim().toLowerCase(), phone_number, address, profilePicture, user_id]
        : [full_name, email.trim().toLowerCase(), phone_number, address, user_id];

    db.run(sql, params, function (err) {
        if (err) return res.status(400).json({ success: false, error: 'Email may already be in use.' });
        if (this.changes === 0) return res.status(404).json({ success: false, error: 'User not found.' });

        db.get('SELECT id, username, email, full_name, phone_number, address, profile_picture FROM users WHERE id = ?', [user_id], (err, user) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            res.json({ success: true, message: 'Changes saved!', user: publicUser(user), profile_picture: profilePicture });
        });
    });
});

app.put('/api/user/:id/password', (req, res) => {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) return res.status(400).json({ error: 'Passwords are required.' });
    if (new_password.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters.' });

    db.get('SELECT password FROM users WHERE id = ?', [req.params.id], async (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(404).json({ error: 'User not found.' });

        const isMatch = await bcrypt.compare(current_password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Incorrect current password.' });

        const hashedPassword = await bcrypt.hash(new_password, 10);
        db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.params.id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Password updated successfully' });
        });
    });
});

app.use((err, _req, res, _next) => {
    res.status(400).json({ error: err.message || 'Request failed.' });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
