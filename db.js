// db.js
// SQLite database connection, schema creation, safe migrations, and seed data.
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DB_PATH || path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to the database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        db.serialize(initDb);
    }
});

function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

async function addColumnIfMissing(table, column, definition) {
    const columns = await new Promise((resolve, reject) => {
        db.all(`PRAGMA table_info(${table})`, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });

    if (!columns.some((c) => c.name === column)) {
        await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
        console.log(`Added missing column: ${table}.${column}`);
    }
}

async function initDb() {
    try {
        await run(`CREATE TABLE IF NOT EXISTS cars (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            price_per_day REAL NOT NULL CHECK(price_per_day > 0),
            transmission TEXT NOT NULL,
            engine TEXT DEFAULT '',
            seats INTEGER NOT NULL DEFAULT 5,
            fuel TEXT NOT NULL,
            image_url TEXT NOT NULL
        )`);

        await run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            full_name TEXT DEFAULT '',
            phone_number TEXT DEFAULT '',
            address TEXT DEFAULT '',
            profile_picture TEXT
        )`);

        await run(`CREATE TABLE IF NOT EXISTS bookings (
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
            status TEXT NOT NULL DEFAULT 'Confirmed',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE
        )`);

        // Safe migrations for old database.sqlite files.
        await addColumnIfMissing('users', 'full_name', "TEXT DEFAULT ''");
        await addColumnIfMissing('users', 'phone_number', "TEXT DEFAULT ''");
        await addColumnIfMissing('users', 'address', "TEXT DEFAULT ''");
        await addColumnIfMissing('users', 'profile_picture', 'TEXT');

        await addColumnIfMissing('bookings', 'phone_number', "TEXT NOT NULL DEFAULT ''");
        await addColumnIfMissing('bookings', 'payment_method', "TEXT NOT NULL DEFAULT 'Pay at Pickup'");
        await addColumnIfMissing('bookings', 'status', "TEXT NOT NULL DEFAULT 'Confirmed'");
        await addColumnIfMissing('bookings', 'created_at', 'TEXT DEFAULT CURRENT_TIMESTAMP');

        await addColumnIfMissing('cars', 'engine', "TEXT DEFAULT ''");
        await addColumnIfMissing('cars', 'seats', 'INTEGER NOT NULL DEFAULT 5');
        await addColumnIfMissing('cars', 'fuel', "TEXT DEFAULT 'Petrol'");

        await seedCars();
    } catch (err) {
        console.error('Database initialization failed:', err.message);
    }
}

async function seedCars() {
    const row = await get('SELECT COUNT(*) as count FROM cars');
    if (row.count > 0) return;

    console.log('Seeding initial cars...');
    const initialCars = [
        { name: 'Honda Civic', category: 'Economy', price_per_day: 45, transmission: 'Automatic', engine: '2.0L I4', seats: 5, fuel: 'Petrol', image_url: '/images/civic.png' },
        { name: 'Kia Rio', category: 'Hatchback', price_per_day: 40, transmission: 'Automatic', engine: '1.6L I4', seats: 5, fuel: 'Petrol', image_url: '/images/kia.png' },
        { name: 'Ford Mustang', category: 'Sports', price_per_day: 120, transmission: 'Manual', engine: '5.0L V8', seats: 4, fuel: 'Petrol', image_url: '/images/mustang.png' },
        { name: 'Toyota RAV4', category: 'SUV', price_per_day: 75, transmission: 'Automatic', engine: '2.5L 4-Cyl', seats: 5, fuel: 'Hybrid', image_url: '/images/rav4.png' },
        { name: 'Tesla Model 3', category: 'Electric', price_per_day: 110, transmission: 'Automatic', engine: 'Dual Motor', seats: 5, fuel: 'Electric', image_url: '/images/tesla.png' },
        { name: 'Jeep Wrangler', category: 'Off-Road', price_per_day: 95, transmission: 'Manual', engine: '3.6L V6', seats: 4, fuel: 'Petrol', image_url: '/images/wrangler.png' }
    ];

    const stmt = db.prepare('INSERT INTO cars (name, category, price_per_day, transmission, engine, seats, fuel, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    initialCars.forEach((car) => {
        stmt.run(car.name, car.category, car.price_per_day, car.transmission, car.engine, car.seats, car.fuel, car.image_url);
    });
    stmt.finalize();
}

module.exports = db;
