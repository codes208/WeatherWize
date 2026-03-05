CREATE DATABASE IF NOT EXISTS weatherwize;
USE weatherwize;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  role ENUM('admin', 'general', 'advanced') NOT NULL DEFAULT 'general',
  status ENUM('active', 'suspended') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- If the users table already exists, run this to add the email column:
-- ALTER TABLE users ADD COLUMN email VARCHAR(255) AFTER password;

CREATE TABLE IF NOT EXISTS saved_locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  location_name VARCHAR(255) NOT NULL,
  lat DECIMAL(10, 8),
  lon DECIMAL(11, 8),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS alerts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  location_name VARCHAR(255) NOT NULL,
  trigger_type VARCHAR(100) NOT NULL,
  threshold_value DECIMAL(10, 2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS system_settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  setting_value VARCHAR(255) NOT NULL
);

-- Seed default system settings
INSERT IGNORE INTO system_settings (setting_key, setting_value) VALUES
  ('maintenance_mode', 'false'),
  ('api_throttle_limit', '500');

