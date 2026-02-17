require('dotenv').config();
const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

console.log('Testing connection with:');
console.log(`User: ${process.env.DB_USER}`);
console.log(`Password: ${process.env.DB_PASSWORD}`);

connection.connect((err) => {
    if (err) {
        console.error('❌ Connection Failed:', err.message);
    } else {
        console.log('✅ Connection Successful!');
    }
    connection.end();
});
