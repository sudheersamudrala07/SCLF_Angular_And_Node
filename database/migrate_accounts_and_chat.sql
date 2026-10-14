-- Run once on an existing smart_campus_db that was created before accounts/chat.
USE smart_campus_db;

CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    password_hash VARCHAR(128) NOT NULL,
    password_salt VARCHAR(64) NOT NULL,
    role ENUM('student', 'admin') NOT NULL DEFAULT 'student',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

ALTER TABLE lost_found_items ADD COLUMN reported_by_user_id INT NULL;
ALTER TABLE lost_found_items
    ADD CONSTRAINT fk_item_reporter
    FOREIGN KEY (reported_by_user_id) REFERENCES users(user_id)
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE item_conversations (
    conversation_id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    owner_user_id INT NOT NULL,
    student_user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_item_student_conversation (item_id, student_user_id),
    FOREIGN KEY (item_id) REFERENCES lost_found_items(id) ON DELETE CASCADE,
    FOREIGN KEY (owner_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (student_user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE item_messages (
    message_id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    sender_user_id INT NOT NULL,
    body VARCHAR(2000) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES item_conversations(conversation_id) ON DELETE CASCADE,
    FOREIGN KEY (sender_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX ix_conversation_created (conversation_id, created_at)
) ENGINE=InnoDB;
