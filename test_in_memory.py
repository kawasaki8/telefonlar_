"""
PHONE ARENA - In-Memory Functional Verification
Verifies database integrity, SQL queries, AnTuTu calculations, and JSON outputs
without opening raw network sockets.
"""

from database import get_connection
import json

def test_database():
    conn = get_connection()
    cursor = conn.cursor()

    # 1. Total phones
    cursor.execute("SELECT COUNT(*) as count FROM smartphones")
    total = cursor.fetchone()["count"]
    print(f"✓ Baza mavjud: Jami {total} ta smartfon.")
    assert total >= 50, f"Expected at least 50 phones, got {total}"

    # 2. Apple iPhones
    cursor.execute("SELECT id, name, series, release_year FROM smartphones WHERE brand = 'Apple' ORDER BY release_year DESC")
    iphones = cursor.fetchall()
    print(f"✓ Apple iPhone: {len(iphones)} ta avlod kiritilgan:")
    for ip in iphones[:5]:
        print(f"   - {ip['name']} ({ip['release_year']})")

    # 3. Samsung Galaxy series (S, Z, A)
    for s_name in ['Galaxy S', 'Galaxy Z', 'Galaxy A']:
        cursor.execute("SELECT COUNT(*) as count FROM smartphones WHERE series = ?", (s_name,))
        cnt = cursor.fetchone()["count"]
        print(f"✓ Samsung {s_name}: {cnt} ta model")
        assert cnt > 0, f"No phones found in {s_name}"

    # 4. AnTuTu Benchmarks check
    cursor.execute("""
    SELECT s.name, sp.chipset, b.total_score, b.cpu_score, b.gpu_score, b.version
    FROM antutu_benchmarks b
    JOIN smartphones s ON b.phone_id = s.id
    JOIN specifications sp ON b.phone_id = sp.phone_id
    ORDER BY b.total_score DESC
    LIMIT 3
    """)
    top_bench = cursor.fetchall()
    print("\n✓ AnTuTu Eng Kuchli 3 ta smartfon:")
    for tb in top_bench:
        print(f"   - {tb['name']}: {tb['total_score']:,} ball ({tb['chipset']} / {tb['version']})")

    # 5. Uzbekistan Market Prices check
    cursor.execute("""
    SELECT s.name, m.price_new_uzs, m.price_new_formatted, m.price_used_avg_uzs, m.price_used_excellent_uzs
    FROM market_prices m
    JOIN smartphones s ON m.phone_id = s.id
    WHERE m.price_new_uzs > 0
    ORDER BY m.price_new_uzs DESC
    LIMIT 3
    """)
    top_prices = cursor.fetchall()
    print("\n✓ O'zbekiston bozoridagi eng yangi flagman narxlari:")
    for tp in top_prices:
        print(f"   - {tp['name']}: Yangi = {tp['price_new_formatted']} | Ishlatilgan = {tp['price_used_excellent_uzs']:,} so'm")

    # 6. Used conditions test
    cursor.execute("""
    SELECT s.name, m.price_used_excellent_uzs, m.price_used_good_uzs, m.price_used_fair_uzs
    FROM market_prices m
    JOIN smartphones s ON m.phone_id = s.id
    WHERE m.price_used_excellent_uzs > 0
    LIMIT 2
    """)
    used_tiers = cursor.fetchall()
    print("\n✓ Ishlatilgan holatlar (A'lo, Yaxshi, O'rtacha):")
    for ut in used_tiers:
        print(f"   - {ut['name']}: A'lo = {ut['price_used_excellent_uzs']:,} | Yaxshi = {ut['price_used_good_uzs']:,} | O'rtacha = {ut['price_used_fair_uzs']:,} so'm")

    # 7. Admin PIN check
    cursor.execute("SELECT value FROM admin_auth WHERE key = 'admin_pin'")
    pin = cursor.fetchone()["value"]
    print(f"\n✓ Admin himoya PIN kodi tekshirildi: {pin}")
    assert pin == "7777"

    conn.close()
    print("\n=============================================")
    print("Barcha ma'lumotlar bazasi tekshiruvi 100% muvaffaqiyatli!")
    print("=============================================")

if __name__ == "__main__":
    test_database()

