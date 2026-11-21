"""
PHONE ARENA - Database Module
SQLite database manager for smartphones, specifications, benchmarks, and market prices.
"""

import sqlite3
import json
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "phone_arena.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # Smartphones main table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS smartphones (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        brand TEXT NOT NULL,          -- Apple, Samsung
        series TEXT NOT NULL,         -- iPhone, Galaxy A, Galaxy Z, Galaxy S
        category TEXT NOT NULL,       -- flagman, orta, budjet
        release_year INTEGER NOT NULL,
        release_date TEXT NOT NULL,
        image_url TEXT NOT NULL,
        colors_json TEXT,
        is_featured INTEGER DEFAULT 0,
        views INTEGER DEFAULT 0
    )
    """)

    # Specifications table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS specifications (
        phone_id TEXT PRIMARY KEY,
        display_size TEXT NOT NULL,
        display_tech TEXT NOT NULL,
        resolution TEXT NOT NULL,
        refresh_rate TEXT NOT NULL,
        chipset TEXT NOT NULL,
        chipset_manufacturer TEXT NOT NULL,
        cpu_arch TEXT NOT NULL,
        cpu_cores INTEGER NOT NULL,
        max_clock TEXT NOT NULL,
        process_node TEXT NOT NULL,
        gpu TEXT NOT NULL,
        processor_explanation TEXT NOT NULL,
        main_camera TEXT NOT NULL,
        front_camera TEXT NOT NULL,
        camera_features TEXT,
        battery_mah INTEGER NOT NULL,
        charging_speed TEXT NOT NULL,
        os TEXT NOT NULL,
        ram TEXT NOT NULL,
        storage TEXT NOT NULL,
        dimensions TEXT NOT NULL,
        weight TEXT NOT NULL,
        water_resistance TEXT NOT NULL,
        FOREIGN KEY (phone_id) REFERENCES smartphones(id) ON DELETE CASCADE
    )
    """)

    # AnTuTu benchmark table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS antutu_benchmarks (
        phone_id TEXT PRIMARY KEY,
        total_score INTEGER NOT NULL,
        cpu_score INTEGER NOT NULL,
        gpu_score INTEGER NOT NULL,
        mem_score INTEGER NOT NULL,
        ux_score INTEGER NOT NULL,
        version TEXT NOT NULL,
        tested_date TEXT NOT NULL,
        source TEXT NOT NULL,
        verified INTEGER DEFAULT 1,
        FOREIGN KEY (phone_id) REFERENCES smartphones(id) ON DELETE CASCADE
    )
    """)

    # Uzbekistan market prices table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS market_prices (
        phone_id TEXT PRIMARY KEY,
        price_new_uzs INTEGER NOT NULL,           -- New in UZS (0 if discontinued / not available)
        price_new_formatted TEXT NOT NULL,
        new_shops_json TEXT,                     -- Array of shops (Malika, Texnomart, MediaPark, etc.)
        price_used_avg_uzs INTEGER NOT NULL,     -- Used average in UZS
        price_used_excellent_uzs INTEGER NOT NULL,-- A'lo holat
        price_used_good_uzs INTEGER NOT NULL,     -- Yaxshi holat
        price_used_fair_uzs INTEGER NOT NULL,     -- O'rtacha holat
        market_notes TEXT,
        last_updated TEXT NOT NULL,
        sources_links_json TEXT,
        FOREIGN KEY (phone_id) REFERENCES smartphones(id) ON DELETE CASCADE
    )
    """)

    # Admin sessions / settings
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS admin_auth (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )
    """)

    # Default admin PIN / key
    cursor.execute("INSERT OR IGNORE INTO admin_auth (key, value) VALUES ('admin_pin', '7777')")

    conn.commit()
    conn.close()
    print("Database schema successfully initialized.")

if __name__ == "__main__":
    init_db()

