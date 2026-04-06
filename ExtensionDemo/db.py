"""
ToneEase - Database Setup Script
Run ONCE to create all tables in Railway MySQL
"""
import sys
print("Script started!", flush=True)
import pymysql
from datetime import datetime

# ============================================
# Clever Cloud MySQL Connection
# ============================================
DB_URL = "mysql://ude5yjbp0ewv3hvm:zErjFsjSbn5S7HqiBHWs@bcx5fv5waqgibypeolos-mysql.services.clever-cloud.com:3306/cx5fv5waqgibypeolos"

def get_connection():
    return pymysql.connect(
        host="bcx5fv5waqgibypeolos-mysql.services.clever-cloud.com",
        port=3306,
        user="ude5yjbp0ewv3hvm",
        password="zErjFsjSbn5S7HqiBHWs",
        database="bcx5fv5waqgibypeolos",
        charset="utf8mb4"
    )

def create_tables():
    conn = get_connection()
    cursor = conn.cursor()

    print("Creating tables...")

    # 1. USERS TABLE
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            user_id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print(" users table created")

    # 2. SESSIONS TABLE (for anonymous users)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            session_id VARCHAR(100) PRIMARY KEY,
            user_id INT DEFAULT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
        )
    """)
    print(" sessions table created")

    # 3. HISTORY TABLE
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS history (
            history_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT DEFAULT NULL,
            session_id VARCHAR(100) DEFAULT NULL,
            original_text TEXT NOT NULL,
            rewritten_text TEXT DEFAULT NULL,
            detected_tone VARCHAR(50) DEFAULT NULL,
            mode VARCHAR(20) DEFAULT 'auto',
            platform VARCHAR(50) DEFAULT 'unknown',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
            FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE SET NULL
        )
    """)
    print(" history table created")

    # 4. TONE SETTINGS TABLE (user preferences)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tone_settings (
            setting_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT UNIQUE NOT NULL,
            sensitivity VARCHAR(10) DEFAULT 'medium',
            default_tone VARCHAR(20) DEFAULT 'polite',
            auto_mode BOOLEAN DEFAULT TRUE,
            manual_mode BOOLEAN DEFAULT FALSE,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        )
    """)
    print(" tone_settings table created")

    # 5. FEEDBACK TABLE (accept/reject tracking)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS feedback (
            feedback_id INT AUTO_INCREMENT PRIMARY KEY,
            history_id INT NOT NULL,
            user_id INT DEFAULT NULL,
            session_id VARCHAR(100) DEFAULT NULL,
            action VARCHAR(20) NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (history_id) REFERENCES history(history_id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
        )
    """)
    print(" feedback table created")
    cursor.execute("ALTER TABLE history CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
    cursor.execute("ALTER TABLE feedback CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
    cursor.execute("ALTER TABLE sessions CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
    cursor.execute("ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
    cursor.execute("ALTER TABLE tone_settings CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
    print("Emoji support enabled!")
    conn.commit()
    cursor.close()
    conn.close()
    print("\nAll 5 tables created successfully!")

if __name__ == "__main__":
    try:
        create_tables()
    except Exception as e:
        print(f"Error: {e}")