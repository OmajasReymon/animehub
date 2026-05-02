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
