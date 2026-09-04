// SQLite connection and idempotent schema migration.
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DB_PATH || path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
    return new Promise((resolve, reject) => db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve(this);
    }));
}

function all(sql, params = []) {
    return new Promise((resolve, reject) => db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows)));
}

async function addColumnIfMissing(table, column, definition) {
    const columns = await all(`PRAGMA table_info(${table})`);
    if (!columns.some(c => c.name === column)) await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

async function initDb() {
    await run('PRAGMA foreign_keys = ON');
    await run(`CREATE TABLE IF NOT EXISTS cars (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL, category TEXT NOT NULL, price_per_day REAL NOT NULL CHECK (price_per_day >= 0),
        transmission TEXT NOT NULL, engine TEXT NOT NULL, seats INTEGER NOT NULL DEFAULT 5,
        fuel TEXT NOT NULL, image_url TEXT NOT NULL, video_url TEXT DEFAULT ''
    )`);
    await run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
        full_name TEXT DEFAULT '', phone_number TEXT DEFAULT '', address TEXT DEFAULT '',
        profile_picture TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
    await run(`CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, car_id INTEGER NOT NULL,
        pickup_date TEXT NOT NULL, return_date TEXT NOT NULL, province TEXT NOT NULL,
        landmark TEXT NOT NULL, phone_number TEXT NOT NULL, payment_method TEXT NOT NULL,
        total_price REAL NOT NULL CHECK (total_price >= 0), status TEXT NOT NULL DEFAULT 'Confirmed',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id), FOREIGN KEY (car_id) REFERENCES cars(id)
    )`);
    await run(`CREATE TABLE IF NOT EXISTS survey_responses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        experience TEXT NOT NULL,
        favorite_feature TEXT NOT NULL,
        improvements TEXT NOT NULL,
        device TEXT NOT NULL,
        respondent_type TEXT NOT NULL DEFAULT 'customer',
        name TEXT NOT NULL DEFAULT '',
        email TEXT NOT NULL DEFAULT '',
        consent INTEGER NOT NULL DEFAULT 0,
        review_status TEXT NOT NULL DEFAULT 'New',
        reviewer_notes TEXT NOT NULL DEFAULT '',
        answers TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
    await addColumnIfMissing('survey_responses', 'respondent_type', "TEXT NOT NULL DEFAULT 'customer'");
    await addColumnIfMissing('survey_responses', 'name', "TEXT NOT NULL DEFAULT ''");
    await addColumnIfMissing('survey_responses', 'email', "TEXT NOT NULL DEFAULT ''");
    await addColumnIfMissing('survey_responses', 'consent', 'INTEGER NOT NULL DEFAULT 0');
    await addColumnIfMissing('survey_responses', 'review_status', "TEXT NOT NULL DEFAULT 'New'");
    await addColumnIfMissing('survey_responses', 'reviewer_notes', "TEXT NOT NULL DEFAULT ''");
    await addColumnIfMissing('survey_responses', 'answers', "TEXT NOT NULL DEFAULT '{}'");
    await addColumnIfMissing('survey_responses', 'updated_at', "TEXT NOT NULL DEFAULT ''");

    // Migrate databases created by older versions without dropping user data.
    await addColumnIfMissing('users', 'full_name', "TEXT DEFAULT ''");
    await addColumnIfMissing('users', 'phone_number', "TEXT DEFAULT ''");
    await addColumnIfMissing('users', 'address', "TEXT DEFAULT ''");
    await addColumnIfMissing('users', 'profile_picture', 'TEXT');
    // SQLite only permits constant defaults in ALTER TABLE ADD COLUMN.
    await addColumnIfMissing('users', 'created_at', "TEXT NOT NULL DEFAULT ''");
    await addColumnIfMissing('users', 'updated_at', "TEXT NOT NULL DEFAULT ''");
    await addColumnIfMissing('cars', 'video_url', "TEXT DEFAULT ''");
    await addColumnIfMissing('bookings', 'phone_number', "TEXT NOT NULL DEFAULT ''");
    await addColumnIfMissing('bookings', 'payment_method', "TEXT NOT NULL DEFAULT 'Pay at Pickup'");
    await addColumnIfMissing('bookings', 'status', "TEXT NOT NULL DEFAULT 'Confirmed'");
    await addColumnIfMissing('bookings', 'created_at', "TEXT NOT NULL DEFAULT ''");
    await addColumnIfMissing('bookings', 'updated_at', "TEXT NOT NULL DEFAULT ''");
    await run("UPDATE bookings SET status = 'Confirmed' WHERE status IS NULL OR status = ''");
    await run("UPDATE bookings SET created_at = CURRENT_TIMESTAMP WHERE created_at = ''");
    await run("UPDATE bookings SET updated_at = CURRENT_TIMESTAMP WHERE updated_at = ''");
    await run("UPDATE users SET created_at = CURRENT_TIMESTAMP WHERE created_at = ''");
    await run("UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE updated_at = ''");
    await run("UPDATE users SET full_name = COALESCE(full_name, ''), phone_number = COALESCE(phone_number, ''), address = COALESCE(address, '')");
    await seedCars();
}

async function seedCars() {
    const row = await new Promise((resolve, reject) => db.get('SELECT COUNT(*) AS count FROM cars', (err, r) => err ? reject(err) : resolve(r)));
    if (row.count) return;
    const cars = [
        ['Ford Mustang', 'Sports', 120, 'Manual', '5.0L V8', 4, 'Petrol', '/images/mustang.png', 'https://www.youtube.com/results?search_query=Ford+Mustang+driving+review'],
        ['Toyota RAV4', 'SUV', 65, 'Automatic', '2.5L 4-Cyl', 5, 'Hybrid', '/images/rav4.png', 'https://www.youtube.com/results?search_query=Toyota+RAV4+driving+review'],
        ['Tesla Model 3', 'Electric', 85, 'Automatic', 'Dual Motor', 5, 'Electric', '/images/tesla.png', 'https://www.youtube.com/results?search_query=Tesla+Model+3+driving+review'],
        ['Jeep Wrangler', 'SUV', 95, 'Automatic', '3.6L V6', 5, 'Petrol', '/images/wrangler.png', 'https://www.youtube.com/results?search_query=Jeep+Wrangler+driving+review'],
        ['Kia Rio', 'Hatchback', 40, 'Automatic', '1.6L I4', 5, 'Petrol', '/images/kia.png', 'https://www.youtube.com/results?search_query=Kia+Rio+driving+review'],
        ['Honda Civic', 'Sedan', 50, 'Automatic', '2.0L I4', 5, 'Petrol', '/images/civic.png', 'https://www.youtube.com/results?search_query=Honda+Civic+driving+review']
    ];
    for (const car of cars) await run('INSERT INTO cars (name, category, price_per_day, transmission, engine, seats, fuel, image_url, video_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', car);
}

db.ready = initDb().then(() => console.log('Connected to the SQLite database.')).catch(err => {
    console.error('Database initialization failed:', err.message);
    throw err;
});

module.exports = db;
