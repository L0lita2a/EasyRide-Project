// db.js
// This module handles SQLite database connection, table creation, and seed data.
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DB_PATH || path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to the database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initDb();
    }
});

function initDb() {
    // Create cars table
    db.run(`CREATE TABLE IF NOT EXISTS cars (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        price_per_day REAL NOT NULL,
        transmission TEXT NOT NULL,
        engine TEXT NOT NULL,
        seats INTEGER NOT NULL,
        fuel TEXT NOT NULL,
        image_url TEXT NOT NULL
    )`, (err) => {
        if (err) console.error(err.message);
        else seedCars();
    });

    // Create users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
    )`);

    // Create bookings table
    db.run(`CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        car_id INTEGER NOT NULL,
        pickup_date TEXT NOT NULL,
        return_date TEXT NOT NULL,
        province TEXT NOT NULL,
        landmark TEXT NOT NULL,
        phone_number TEXT NOT NULL,
        payment_method TEXT NOT NULL,
        total_price REAL NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (car_id) REFERENCES cars(id)
    )`);
}

function seedCars() {
    // Check if cars exist before inserting
    db.get('SELECT COUNT(*) as count FROM cars', (err, row) => {
        if (err) {
            console.error(err.message);
        } else if (row.count === 0) {
            console.log('Seeding initial cars...');
            const stmt = db.prepare('INSERT INTO cars (name, category, price_per_day, transmission, engine, seats, fuel, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');

            const initialCars = [
                { name: 'Ford Mustang', category: 'Sports', price_per_day: 120, transmission: 'Manual', engine: '5.0L V8', seats: 4, fuel: 'Petrol', image_url: '/images/mustang.png' },
                { name: 'Toyota RAV4', category: 'SUV', price_per_day: 65, transmission: 'Automatic', engine: '2.5L 4-Cyl', seats: 5, fuel: 'Hybrid', image_url: '/images/rav4.png' },
                { name: 'Tesla Model 3', category: 'Electric', price_per_day: 85, transmission: 'Automatic', engine: 'Dual Motor', seats: 5, fuel: 'Electric', image_url: '/images/tesla.png' },
                { name: 'Jeep Wrangler', category: 'SUV', price_per_day: 95, transmission: 'Automatic', engine: '3.6L V6', seats: 5, fuel: 'Petrol', image_url: '/images/wrangler.png' },
                { name: 'Kia Rio', category: 'Hatchback', price_per_day: 40, transmission: 'Automatic', engine: '1.6L I4', seats: 5, fuel: 'Petrol', image_url: '/images/kia.png' },
                { name: 'Honda Civic', category: 'Sedan', price_per_day: 50, transmission: 'Automatic', engine: '2.0L I4', seats: 5, fuel: 'Petrol', image_url: '/images/civic.png' }
            ];

            initialCars.forEach(car => {
                stmt.run(car.name, car.category, car.price_per_day, car.transmission, car.engine, car.seats, car.fuel, car.image_url);
            });
            stmt.finalize();
        }
    });
}

module.exports = db;
