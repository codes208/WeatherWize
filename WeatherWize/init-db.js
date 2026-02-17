require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function initDatabase() {
    try {
        // 1. Connect without selecting a database
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            multipleStatements: true
            // Do not specify database yet, in case it doesn't exist
        });

        console.log('✅ Connected to MySQL server');

        // 2. Read schema.sql
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // 3. Execute schema (split by semicolon to handle multiple statements if needed, 
        // although mysql2 has support for multiple statements if enabled. 
        // For safety with simple `schema.sql` that has CREATE DATABASE, we can run it.)

        // Changing connection to allow multiple statements
        await connection.changeUser({ multipleStatements: true });

        console.log('⚙️  Running schema.sql...');
        await connection.query(schema);

        console.log('✅ Database and tables created successfully!');
        await connection.end();
    } catch (error) {
        console.error('❌ Error initializing database:', error.message);
        process.exit(1);
    }
}

initDatabase();
