const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');
db.run("ALTER TABLE cars ADD COLUMN seats INTEGER NOT NULL DEFAULT 5", (err) => {
    if(err) console.error(err);
    else {
        // Set Mustang to 4 seats
        db.run("UPDATE cars SET seats = 4 WHERE name = 'Ford Mustang'");
        console.log("Column seats added");
    }
});
