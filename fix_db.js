const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');
db.run("ALTER TABLE bookings ADD COLUMN phone_number TEXT NOT NULL DEFAULT ''", (err) => {
    if(err) console.error(err);
    else console.log("Column added");
});
