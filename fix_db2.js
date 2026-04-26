const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');
db.run("ALTER TABLE bookings ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'Pay at Pickup'", (err) => {
    if(err) console.error(err);
    else console.log("Column payment_method added");
});
