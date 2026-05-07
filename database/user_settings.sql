CREATE DATABASE IF NOT EXISTS animehub_db;
USE animehub_db;

CREATE TABLE IF NOT EXISTS users (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

SET @role_column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'role'
);

SET @role_column_sql = IF(
    @role_column_exists = 0,
    'ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT ''user''',
    'SELECT ''role column already exists'''
);

PREPARE role_column_statement FROM @role_column_sql;
EXECUTE role_column_statement;
DEALLOCATE PREPARE role_column_statement;

CREATE TABLE IF NOT EXISTS favorites (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    mal_id INT NOT NULL,
    title VARCHAR(255) NULL,
    image TEXT NULL,
    score DECIMAL(4,2) NULL,
    status VARCHAR(80) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_anime (user_id, mal_id)
);

CREATE TABLE IF NOT EXISTS user_settings (
    user_id INT NOT NULL PRIMARY KEY,
    username VARCHAR(80) NOT NULL,
    bio TEXT NULL,
    notifications_email TINYINT(1) NOT NULL DEFAULT 1,
    notifications_push TINYINT(1) NOT NULL DEFAULT 0,
    new_release_alerts TINYINT(1) NOT NULL DEFAULT 1,
    preferred_language VARCHAR(50) NOT NULL DEFAULT 'English',
    subtitle_preference VARCHAR(50) NOT NULL DEFAULT 'English Subtitles',
    auto_play_next_episode TINYINT(1) NOT NULL DEFAULT 1,
    adult_content TINYINT(1) NOT NULL DEFAULT 0,
    profile_visible TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO users (name, email, password, role)
VALUES (
    'AnimeHub Admin',
    'admin@animehub.local',
    '$2b$10$18BmG/83MQhRgV5fax0We.CyUqbPqrxh3w1cB84w.pWtRdfmynXza',
    'admin'
)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    password = VALUES(password),
    role = 'admin';
