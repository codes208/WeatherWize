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

        // Migrations — idempotent column additions for existing databases
        await connection.query('USE weatherwize');
        try {
            await connection.query('ALTER TABLE alerts ADD COLUMN threshold_max DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER threshold_value');
            console.log('✅ Migration: added threshold_max column to alerts');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️  Migration: threshold_max column already exists');
            } else {
                throw e;
            }
        }

        // 4. Create default admin user
        const bcrypt = require('bcrypt');

        // Select the database explicitly to insert into users table
        await connection.query('USE weatherwize');

        const [users] = await connection.query("SELECT id FROM users WHERE username = 'admin'");
        if (users.length === 0) {
            console.log('⚙️  Creating default admin user...');
            const hashedPassword = await bcrypt.hash('admin', 10);
            await connection.query(
                "INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)",
                ['admin', hashedPassword, 'admin@weatherwize.com', 'admin']
            );
            console.log('✅ Default admin user created successfully!');
        } else {
            console.log('ℹ️  Admin user already exists.');
        }

        await connection.end();
    } catch (error) {
        console.error('❌ Error initializing database:', error.message);
        process.exit(1);
    }
}

initDatabase();
