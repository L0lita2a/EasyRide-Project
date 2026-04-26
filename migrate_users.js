const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to the database:', err.message);
        return;
    }
    console.log('Connected to the SQLite database.');
    
    db.run("ALTER TABLE users ADD COLUMN full_name TEXT DEFAULT ''", (err) => {
        if(err) console.log('full_name column might already exist:', err.message);
        db.run("ALTER TABLE users ADD COLUMN phone_number TEXT DEFAULT ''", (err) => {
            if(err) console.log('phone_number column might already exist:', err.message);
            db.run("ALTER TABLE users ADD COLUMN address TEXT DEFAULT ''", (err) => {
                if(err) console.log('address column might already exist:', err.message);
                console.log("Migration complete.");
                db.close();
            });
        });
    });
});
