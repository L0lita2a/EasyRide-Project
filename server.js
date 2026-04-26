// server.js
// Main application file
const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const multer = require('multer');
const db = require('./db');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        cb(null, 'avatar-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON body
app.use(express.json());
// Middleware to serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve My Bookings page
app.get('/my-bookings', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'my-bookings.html'));
});

// Serve Booking page
app.get('/booking', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'booking.html'));
});

// Serve History page (Deprecated but keeping redirect just in case)
app.get('/history', (req, res) => {
    res.redirect('/my-bookings');
});

// Serve Legal pages
app.get('/terms', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'terms.html'));
});

app.get('/privacy', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'privacy.html'));
});

app.get('/cookies', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'cookies.html'));
});

// Serve Profile page
app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

// API Endpoint to get all cars
app.get('/api/cars', (req, res) => {
    db.all('SELECT * FROM cars', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ cars: rows });
    });
});

// API Endpoint to get a single car
app.get('/api/cars/:id', (req, res) => {
    const id = req.params.id;
    db.get('SELECT * FROM cars WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Car not found' });
        res.json(row);
    });
});

// Auth endpoints
app.post('/api/auth/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'All fields required' });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = `INSERT INTO users (username, email, password) VALUES (?, ?, ?)`;
        db.run(sql, [username, email, hashedPassword], function(err) {
            if (err) return res.status(400).json({ error: 'Username or email already exists.' });
            res.json({ message: 'Registration successful' });
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

        res.json({ 
            message: 'Login successful', 
            user: { id: user.id, username: user.username, email: user.email } 
        });
    });
});

app.post('/api/auth/forgot-password', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    // In a real app, we would verify the email and send a link.
    res.json({ message: 'Reset link sent' });
});

app.get('/logout', (req, res) => {
    // Since session is in localStorage, we send a quick script to clear it and redirect
    res.send(`<script>localStorage.removeItem('easyride_user'); window.location.href='/';</script>`);
});

// API Endpoint to create a booking
app.post('/api/bookings', (req, res) => {
    const { user_id, car_id, pickup_date, return_date, province, landmark, phone_number, payment_method } = req.body;

    // Basic validation
    if (!user_id || !car_id || !pickup_date || !return_date || !province || !landmark || !phone_number || !payment_method) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    // Get car price to calculate total price securely on server
    db.get('SELECT price_per_day FROM cars WHERE id = ?', [car_id], (err, car) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!car) return res.status(404).json({ error: 'Car not found.' });

        const pickup = new Date(pickup_date);
        const returnD = new Date(return_date);
        
        // Calculate difference in days (at least 1 day)
        const diffTime = Math.abs(returnD - pickup);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
        
        const total_price = diffDays * car.price_per_day;

        // Insert booking into database
        const sql = `INSERT INTO bookings (user_id, car_id, pickup_date, return_date, province, landmark, phone_number, payment_method, total_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        db.run(sql, [user_id, car_id, pickup_date, return_date, province, landmark, phone_number, payment_method, total_price], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({
                message: 'Booking successful!',
                booking: { id: this.lastID, total_price, days: diffDays }
            });
        });
    });
});

// API Endpoint to get user bookings history
app.get('/api/user/bookings', (req, res) => {
    const user_id = req.query.user_id;
    if (!user_id) return res.status(400).json({ error: 'User ID is required' });

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

// API Endpoint to cancel a booking
app.post('/api/cancel-booking', (req, res) => {
    const { bookingId } = req.body;
    if (!bookingId) return res.status(400).json({ error: 'Booking ID is required' });

    db.run("UPDATE bookings SET status = 'Cancelled' WHERE id = ?", [bookingId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Booking not found' });
        res.json({ message: 'Booking cancelled successfully' });
    });
});

// Settings and Payment placeholders
app.get('/payment-methods', (req, res) => {
    res.redirect('/profile#payment');
});

app.get('/settings', (req, res) => {
    res.redirect('/profile#security');
});

// API Endpoint to get user profile details
app.get('/api/user/:id', (req, res) => {
    const user_id = req.params.id;
    const sql = `SELECT id, username, email, full_name, phone_number, address, profile_picture FROM users WHERE id = ?`;
    db.get(sql, [user_id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'User not found' });
        res.json({ user: row });
    });
});

// [PROFESSOR NOTE]: API Endpoint to update user profile details and handle multipart form data (image + text)
app.post('/api/update-profile', upload.single('avatar'), (req, res) => {
    // [PROFESSOR NOTE]: Extract user ID and form fields from the request body
    const user_id = req.body.user_id;
    const { full_name, email, phone_number, address } = req.body;
    
    // Validate if user_id is provided
    if (!user_id) return res.status(400).json({ success: false, error: 'User ID is required' });

    let sql, params;
    // [PROFESSOR NOTE]: Check if a new profile picture was uploaded via multer
    if (req.file) {
        const profile_picture = `/uploads/${req.file.filename}`;
        sql = `UPDATE users SET full_name = ?, email = ?, phone_number = ?, address = ?, profile_picture = ? WHERE id = ?`;
        params = [full_name, email, phone_number, address, profile_picture, user_id];
    } else {
        // [PROFESSOR NOTE]: If no image uploaded, update text fields only
        sql = `UPDATE users SET full_name = ?, email = ?, phone_number = ?, address = ? WHERE id = ?`;
        params = [full_name, email, phone_number, address, user_id];
    }
    
    // Execute SQL query to update database
    db.run(sql, params, function(err) {
        if (err) return res.status(400).json({ success: false, error: 'Email may already be in use or an error occurred.' });
        
        // [PROFESSOR NOTE]: Return a proper JSON response with 'success: true' to prevent frontend timeouts
        if (req.file) {
            res.json({ success: true, message: 'Changes saved!', profile_picture: `/uploads/${req.file.filename}` });
        } else {
            res.json({ success: true, message: 'Changes saved!' });
        }
    });
});

// API Endpoint to update user password
app.put('/api/user/:id/password', (req, res) => {
    const user_id = req.params.id;
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) return res.status(400).json({ error: 'Passwords are required' });

    db.get('SELECT password FROM users WHERE id = ?', [user_id], async (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const isMatch = await bcrypt.compare(current_password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Incorrect current password' });

        const hashedPassword = await bcrypt.hash(new_password, 10);
        db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user_id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Password updated successfully' });
        });
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
