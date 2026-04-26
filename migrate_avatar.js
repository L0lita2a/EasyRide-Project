const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.resolve(__dirname, 'database.sqlite'));

db.run("ALTER TABLE users ADD COLUMN profile_picture TEXT", (err) => {
    if (err) {
        if (err.message.includes('duplicate column name')) {
            console.log('Column already exists.');
        } else {
            console.error('Migration failed:', err.message);
        }
    } else {
        console.log('Successfully added profile_picture column to users table.');
    }
    db.close();
});
