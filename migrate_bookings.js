const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.resolve(__dirname, 'database.sqlite'));
db.run("ALTER TABLE bookings ADD COLUMN status TEXT DEFAULT 'Confirmed'", (err) => {
    if (err) console.log(err.message);
    else console.log('Status column added');
    db.close();
});
