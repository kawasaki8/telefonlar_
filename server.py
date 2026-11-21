"""
PHONE ARENA - High Performance REST API & Web Server
Multi-threaded HTTP server handling full smartphone catalog, dynamic comparisons,
AnTuTu analytics, verified market price tracking, and protected Admin management.
"""

import http.server
import socketserver
import json
import urllib.parse
import os
import mimetypes
import uuid
from database import get_connection

PORT = 5050
STATIC_DIR = os.path.join(os.path.dirname(__file__), "public")

ADMIN_SESSIONS = set()

class PhoneArenaHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)

    def _send_json(self, data, status=200):
        response_bytes = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(response_bytes)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()
        self.wfile.write(response_bytes)

    def _read_body(self):
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length > 0:
            raw_body = self.rfile.read(content_length).decode("utf-8")
            return json.loads(raw_body)
        return {}

    def _is_authenticated(self):
        auth_header = self.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            return token in ADMIN_SESSIONS
        return False

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        # API Routes
        if path == "/api/smartphones":
            self.handle_get_smartphones(query)
        elif path.startswith("/api/smartphones/"):
            phone_id = path.split("/")[-1]
            self.handle_get_smartphone_detail(phone_id)
        elif path == "/api/comparison":
            self.handle_get_comparison(query)
        elif path == "/api/antutu/overview":
            self.handle_get_antutu_overview()
        elif path == "/api/stats":
            self.handle_get_stats()
        elif path == "/api/admin/check":
            self._send_json({"authenticated": self._is_authenticated()})
        else:
            # Fallback to serving public static files
            # If requesting root or a path without extension, serve index.html for SPA routing
            clean_path = path.strip("/")
            full_file_path = os.path.join(STATIC_DIR, clean_path)
            if path == "/" or not os.path.exists(full_file_path) or os.path.isdir(full_file_path):
                self.path = "/index.html"
            return super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/api/admin/login":
            body = self._read_body()
            pin = str(body.get("pin", "")).strip()
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM admin_auth WHERE key = 'admin_pin'")
            row = cursor.fetchone()
            conn.close()

            correct_pin = row["value"] if row else "7777"
            if pin == correct_pin:
                token = str(uuid.uuid4())
                ADMIN_SESSIONS.add(token)
                self._send_json({"success": True, "token": token, "message": "Muvaffaqiyatli kirildi!"})
            else:
                self._send_json({"success": False, "message": "Noto'g'ri PIN kod! Qaytadan urinib ko'ring."}, status=401)

        elif path == "/api/smartphones":
            if not self._is_authenticated():
                self._send_json({"error": "Ruxsat berilmagan! Avval admin sifatida kiring."}, status=403)
                return
            body = self._read_body()
            self.handle_create_smartphone(body)
        else:
            self._send_json({"error": "Topilmadi"}, status=404)

    def do_PUT(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path.startswith("/api/smartphones/"):
            if not self._is_authenticated():
                self._send_json({"error": "Ruxsat berilmagan! Avval admin sifatida kiring."}, status=403)
                return
            phone_id = path.split("/")[-1]
            body = self._read_body()
            self.handle_update_smartphone(phone_id, body)
        else:
            self._send_json({"error": "Topilmadi"}, status=404)

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path.startswith("/api/smartphones/"):
            if not self._is_authenticated():
                self._send_json({"error": "Ruxsat berilmagan! Avval admin sifatida kiring."}, status=403)
                return
            phone_id = path.split("/")[-1]
            self.handle_delete_smartphone(phone_id)
        else:
            self._send_json({"error": "Topilmadi"}, status=404)

    # ------------------ HANDLERS ------------------
    def handle_get_smartphones(self, query):
        brand = query.get("brand", [None])[0]
        series = query.get("series", [None])[0]
        category = query.get("category", [None])[0]
        search = query.get("q", [None])[0]
        sort = query.get("sort", ["antutu_desc"])[0]
        min_antutu = query.get("min_antutu", [None])[0]
        min_price = query.get("min_price", [None])[0]
        max_price = query.get("max_price", [None])[0]

        sql = """
        SELECT 
            s.id, s.name, s.brand, s.series, s.category, s.release_year, s.release_date, s.image_url, s.colors_json, s.is_featured,
            sp.chipset, sp.gpu, sp.display_size, sp.refresh_rate, sp.main_camera, sp.battery_mah, sp.ram, sp.storage,
            b.total_score as antutu_total, b.cpu_score, b.gpu_score, b.mem_score, b.ux_score, b.version as antutu_version,
            m.price_new_uzs, m.price_new_formatted, m.price_used_avg_uzs, m.price_used_excellent_uzs, m.price_used_good_uzs, m.price_used_fair_uzs, m.last_updated
        FROM smartphones s
        LEFT JOIN specifications sp ON s.id = sp.phone_id
        LEFT JOIN antutu_benchmarks b ON s.id = b.phone_id
        LEFT JOIN market_prices m ON s.id = m.phone_id
        WHERE 1=1
        """
        params = []

        if brand and brand.lower() != "all":
            sql += " AND LOWER(s.brand) = LOWER(?)"
            params.append(brand)

        if series and series.lower() != "all":
            sql += " AND LOWER(s.series) = LOWER(?)"
            params.append(series)

        if category and category.lower() != "all":
            sql += " AND LOWER(s.category) = LOWER(?)"
            params.append(category)

        if search:
            search_pattern = f"%{search.strip().lower()}%"
            sql += " AND (LOWER(s.name) LIKE ? OR LOWER(sp.chipset) LIKE ? OR LOWER(s.brand) LIKE ? OR LOWER(s.series) LIKE ?)"
            params.extend([search_pattern, search_pattern, search_pattern, search_pattern])

        if min_antutu:
            try:
                sql += " AND b.total_score >= ?"
                params.append(int(min_antutu))
            except ValueError:
                pass

        if min_price:
            try:
                sql += " AND (m.price_new_uzs >= ? OR m.price_used_avg_uzs >= ?)"
                params.extend([int(min_price), int(min_price)])
            except ValueError:
                pass

        if max_price:
            try:
                sql += " AND ( (m.price_new_uzs > 0 AND m.price_new_uzs <= ?) OR (m.price_new_uzs = 0 AND m.price_used_avg_uzs <= ?) )"
                params.extend([int(max_price), int(max_price)])
            except ValueError:
                pass

        # Sorting
        if sort == "antutu_desc":
            sql += " ORDER BY b.total_score DESC"
        elif sort == "antutu_asc":
            sql += " ORDER BY b.total_score ASC"
        elif sort == "price_desc":
            sql += " ORDER BY CASE WHEN m.price_new_uzs > 0 THEN m.price_new_uzs ELSE m.price_used_avg_uzs END DESC"
        elif sort == "price_asc":
            sql += " ORDER BY CASE WHEN m.price_new_uzs > 0 THEN m.price_new_uzs ELSE m.price_used_avg_uzs END ASC"
        elif sort == "year_desc":
            sql += " ORDER BY s.release_year DESC, s.release_date DESC"
        elif sort == "value_desc":
            # Narx/unumdorlik: AnTuTu / (Price in million UZS)
            sql += " ORDER BY (b.total_score / (CASE WHEN m.price_new_uzs > 0 THEN m.price_new_uzs ELSE m.price_used_avg_uzs END + 1.0)) DESC"
        else:
            sql += " ORDER BY b.total_score DESC"

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(sql, params)
        rows = cursor.fetchall()
        conn.close()

        results = []
        for r in rows:
            results.append({
                "id": r["id"],
                "name": r["name"],
                "brand": r["brand"],
                "series": r["series"],
                "category": r["category"],
                "release_year": r["release_year"],
                "release_date": r["release_date"],
                "image_url": r["image_url"],
                "colors": json.loads(r["colors_json"]) if r["colors_json"] else [],
                "is_featured": bool(r["is_featured"]),
                "chipset": r["chipset"],
                "gpu": r["gpu"],
                "display_size": r["display_size"],
                "refresh_rate": r["refresh_rate"],
                "main_camera": r["main_camera"],
                "battery_mah": r["battery_mah"],
                "ram": r["ram"],
                "storage": r["storage"],
                "antutu": {
                    "total": r["antutu_total"],
                    "cpu": r["cpu_score"],
                    "gpu": r["gpu_score"],
                    "mem": r["mem_score"],
                    "ux": r["ux_score"],
                    "version": r["antutu_version"]
                },
                "market": {
                    "price_new_uzs": r["price_new_uzs"],
                    "price_new_formatted": r["price_new_formatted"],
                    "price_used_avg_uzs": r["price_used_avg_uzs"],
                    "price_used_excellent_uzs": r["price_used_excellent_uzs"],
                    "price_used_good_uzs": r["price_used_good_uzs"],
                    "price_used_fair_uzs": r["price_used_fair_uzs"],
                    "last_updated": r["last_updated"]
                }
            })

        self._send_json({"total": len(results), "smartphones": results})

    def handle_get_smartphone_detail(self, phone_id):
        conn = get_connection()
        cursor = conn.cursor()

        # Increment view count
        cursor.execute("UPDATE smartphones SET views = views + 1 WHERE id = ?", (phone_id,))
        conn.commit()

        cursor.execute("""
        SELECT 
            s.*,
            sp.display_size, sp.display_tech, sp.resolution, sp.refresh_rate,
            sp.chipset, sp.chipset_manufacturer, sp.cpu_arch, sp.cpu_cores, sp.max_clock, sp.process_node, sp.gpu, sp.processor_explanation,
            sp.main_camera, sp.front_camera, sp.camera_features,
            sp.battery_mah, sp.charging_speed, sp.os, sp.ram, sp.storage, sp.dimensions, sp.weight, sp.water_resistance,
            b.total_score, b.cpu_score, b.gpu_score, b.mem_score, b.ux_score, b.version as antutu_version, b.tested_date, b.source as antutu_source,
            m.price_new_uzs, m.price_new_formatted, m.new_shops_json, m.price_used_avg_uzs, m.price_used_excellent_uzs, m.price_used_good_uzs, m.price_used_fair_uzs,
            m.market_notes, m.last_updated, m.sources_links_json
        FROM smartphones s
        LEFT JOIN specifications sp ON s.id = sp.phone_id
        LEFT JOIN antutu_benchmarks b ON s.id = b.phone_id
        LEFT JOIN market_prices m ON s.id = m.phone_id
        WHERE s.id = ?
        """, (phone_id,))
        row = cursor.fetchone()

        if not row:
            conn.close()
            self._send_json({"error": "Smartfon topilmadi"}, status=404)
            return

        # Fetch similar/alternative models in the same category or brand
        cursor.execute("""
        SELECT id, name, brand, series, image_url, category, release_year
        FROM smartphones
        WHERE (series = ? OR category = ?) AND id != ?
        ORDER BY views DESC, release_year DESC
        LIMIT 4
        """, (row["series"], row["category"], phone_id))
        similar_rows = cursor.fetchall()
        conn.close()

        detail = {
            "id": row["id"],
            "name": row["name"],
            "brand": row["brand"],
            "series": row["series"],
            "category": row["category"],
            "release_year": row["release_year"],
            "release_date": row["release_date"],
            "image_url": row["image_url"],
            "colors": json.loads(row["colors_json"]) if row["colors_json"] else [],
            "views": row["views"],
            "specs": {
                "display": {
                    "size": row["display_size"],
                    "tech": row["display_tech"],
                    "resolution": row["resolution"],
                    "refresh_rate": row["refresh_rate"]
                },
                "processor": {
                    "chipset": row["chipset"],
                    "manufacturer": row["chipset_manufacturer"],
                    "cpu_arch": row["cpu_arch"],
                    "cpu_cores": row["cpu_cores"],
                    "max_clock": row["max_clock"],
                    "process_node": row["process_node"],
                    "gpu": row["gpu"],
                    "explanation": row["processor_explanation"]
                },
                "camera": {
                    "main": row["main_camera"],
                    "front": row["front_camera"],
                    "features": row["camera_features"]
                },
                "battery": {
                    "capacity_mah": row["battery_mah"],
                    "charging_speed": row["charging_speed"]
                },
                "system": {
                    "os": row["os"],
                    "ram": row["ram"],
                    "storage": row["storage"]
                },
                "body": {
                    "dimensions": row["dimensions"],
                    "weight": row["weight"],
                    "water_resistance": row["water_resistance"]
                }
            },
            "antutu": {
                "total_score": row["total_score"],
                "cpu_score": row["cpu_score"],
                "gpu_score": row["gpu_score"],
                "mem_score": row["mem_score"],
                "ux_score": row["ux_score"],
                "version": row["antutu_version"],
                "tested_date": row["tested_date"],
                "source": row["antutu_source"]
            },
            "market": {
                "price_new_uzs": row["price_new_uzs"],
                "price_new_formatted": row["price_new_formatted"],
                "new_shops": json.loads(row["new_shops_json"]) if row["new_shops_json"] else [],
                "price_used_avg_uzs": row["price_used_avg_uzs"],
                "price_used_excellent_uzs": row["price_used_excellent_uzs"],
                "price_used_good_uzs": row["price_used_good_uzs"],
                "price_used_fair_uzs": row["price_used_fair_uzs"],
                "market_notes": row["market_notes"],
                "last_updated": row["last_updated"],
                "sources_links": json.loads(row["sources_links_json"]) if row["sources_links_json"] else []
            },
            "similar": [dict(sr) for sr in similar_rows]
        }
        self._send_json(detail)

    def handle_get_comparison(self, query):
        ids_raw = query.get("ids", [""])[0]
        ids = [i.strip() for i in ids_raw.split(",") if i.strip()]

        if not ids:
            self._send_json({"error": "Taqqoslash uchun smartfon tanlanmadi"}, status=400)
            return

        placeholders = ",".join("?" for _ in ids[:3])
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(f"""
        SELECT 
            s.*,
            sp.display_size, sp.display_tech, sp.resolution, sp.refresh_rate,
            sp.chipset, sp.chipset_manufacturer, sp.cpu_arch, sp.cpu_cores, sp.max_clock, sp.process_node, sp.gpu, sp.processor_explanation,
            sp.main_camera, sp.front_camera, sp.camera_features,
            sp.battery_mah, sp.charging_speed, sp.os, sp.ram, sp.storage, sp.dimensions, sp.weight, sp.water_resistance,
            b.total_score as antutu_total, b.cpu_score, b.gpu_score, b.mem_score, b.ux_score, b.version as antutu_version,
            m.price_new_uzs, m.price_new_formatted, m.price_used_avg_uzs, m.price_used_excellent_uzs, m.price_used_good_uzs, m.price_used_fair_uzs
        FROM smartphones s
        LEFT JOIN specifications sp ON s.id = sp.phone_id
        LEFT JOIN antutu_benchmarks b ON s.id = b.phone_id
        LEFT JOIN market_prices m ON s.id = m.phone_id
        WHERE s.id IN ({placeholders})
        """, ids[:3])
        rows = cursor.fetchall()
        conn.close()

        items = []
        for r in rows:
            items.append({
                "id": r["id"],
                "name": r["name"],
                "brand": r["brand"],
                "series": r["series"],
                "image_url": r["image_url"],
                "chipset": r["chipset"],
                "gpu": r["gpu"],
                "display": f"{r['display_size']} {r['display_tech']} ({r['refresh_rate']})",
                "resolution": r["resolution"],
                "camera": r["main_camera"],
                "front_camera": r["front_camera"],
                "battery": f"{r['battery_mah']} mAh ({r['charging_speed']})",
                "battery_mah": r["battery_mah"],
                "ram": r["ram"],
                "storage": r["storage"],
                "os": r["os"],
                "water_resistance": r["water_resistance"],
                "weight": r["weight"],
                "antutu": {
                    "total": r["antutu_total"],
                    "cpu": r["cpu_score"],
                    "gpu": r["gpu_score"],
                    "mem": r["mem_score"],
                    "ux": r["ux_score"],
                    "version": r["antutu_version"]
                },
                "price_new_uzs": r["price_new_uzs"],
                "price_new_formatted": r["price_new_formatted"],
                "price_used_avg_uzs": r["price_used_avg_uzs"],
                "price_used_excellent_uzs": r["price_used_excellent_uzs"]
            })

        # Calculate winners
        winners = {}
        if len(items) > 1:
            best_antutu = max(items, key=lambda x: x["antutu"]["total"])
            best_gpu = max(items, key=lambda x: x["antutu"]["gpu"])
            best_battery = max(items, key=lambda x: x["battery_mah"])
            
            # Cheapest price among available
            available_prices = [x for x in items if x["price_new_uzs"] > 0 or x["price_used_avg_uzs"] > 0]
            if available_prices:
                cheapest = min(available_prices, key=lambda x: x["price_new_uzs"] if x["price_new_uzs"] > 0 else x["price_used_avg_uzs"])
            else:
                cheapest = items[0]

            winners = {
                "antutu": best_antutu["id"],
                "gaming": best_gpu["id"],
                "battery": best_battery["id"],
                "best_value": cheapest["id"]
            }

        # Dynamic expert conclusion in Uzbek
        conclusion = {
            "gaming": f"O'yinlar va yuqori yuklamalar uchun: eng yuqori grafik unumdorlikka ega model tanlanadi.",
            "photography": "Suratga olish uchun: optik zum va professional kamerali tizim ustunlik qiladi.",
            "battery": "Avtonomiya bo'yicha: katta akkumulyator va energiya tejamkor protsessorli model kun davomida eng uzoq ishlaydi.",
            "overall": "Yakuniy xulosa: Taqqoslanayotgan modellar o'rtasida har birining o'z kuchli jihatlari mavjud."
        }

        self._send_json({"items": items, "winners": winners, "conclusion": conclusion})

    def handle_get_antutu_overview(self):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
        SELECT s.id, s.name, s.brand, s.image_url, sp.chipset, b.total_score, b.cpu_score, b.gpu_score, b.mem_score, b.ux_score, b.version
        FROM antutu_benchmarks b
        JOIN smartphones s ON b.phone_id = s.id
        JOIN specifications sp ON b.phone_id = sp.phone_id
        ORDER BY b.total_score DESC
        LIMIT 10
        """)
        top_phones = [dict(r) for r in cursor.fetchall()]
        conn.close()

        overview = {
            "title": "ANTUTU NIMA VA U QANDAY ISHLAYDI?",
            "definition": "AnTuTu — smartfonlarning protsessor (CPU), grafik tezlatkich (GPU), tezkor va doimiy xotira (MEM) hamda foydalanuvchi tajribasi (UX)ni kompleks sinovdan o'tkazuvchi dunyodagi eng mashhur benchmark platformasidir.",
            "components": [
                {
                    "name": "CPU (Markaziy protsessor)",
                    "weight": "Taxminan 25-30%",
                    "description": "Protsessor yadrolarining hisoblash kuchi, ko'p oqimli (multi-core) va bir oqimli (single-core) vazifalarni qanchalik tez bajarishini sinaydi."
                },
                {
                    "name": "GPU (Grafik protsessor)",
                    "weight": "Taxminan 35-40%",
                    "description": "3D o'yinlar, murakkab teksturalar, Ray Tracing (nurlar harakati) va yuqori kadrlar tezligini (FPS) ko'rsatish qobiliyatini o'lchaydi."
                },
                {
                    "name": "MEM (Xotira tezligi)",
                    "weight": "Taxminan 15-20%",
                    "description": "LPDDR5X tezkor xotira va UFS 4.0 / NVMe flesh-xotiraga ma'lumotlarni o'qish va yozish tezligini tekshiradi."
                },
                {
                    "name": "UX (Foydalanuvchi interfeysi)",
                    "weight": "Taxminan 15%",
                    "description": "Kundalik animatsiyalar, ilovalarning ochilish tezligi, hujjatlarni qayta ishlash va ekran chastotasining silliqligini baholaydi."
                }
            ],
            "score_tiers": [
                {"range": "1 800 000+ ball", "tier": "Super Flagmanlar", "desc": "AAA darajadagi eng og'ir o'yinlar, 8K video montaj va sun'iy intellekt hisoblashlari uchun benuqson."},
                {"range": "1 200 000 – 1 700 000 ball", "tier": "Sub-flagman va Flagmanlar", "desc": "Barcha o'yinlarni yuqori sozlamalarda o'ynatadi, har qanday vazifada o'ta tezkor."},
                {"range": "600 000 – 1 100 000 ball", "tier": "Kuchli O'rta Segment", "desc": "Silliq 120Hz interfeys, stabil PUBG 60fps va mukammal energiya tejamkorlik."},
                {"range": "300 000 – 550 000 ball", "tier": "Budjet toifasi", "desc": "Ijtimoiy tarmoqlar, Telegram, YouTube va o'rtacha o'yinlar uchun barqaror."}
            ],
            "important_caveats": [
                "Versiyalar farqi: AnTuTu v9 va v10 ballari bir-biri bilan to'g'ridan-to'g'ri solishtirilmaydi, chunki v10 yangi sinov algoritmlarini qo'shgan.",
                "Sintetik test: Yuqori ball doim ham telefon qizimasdan uzoq vaqt barqaror ishlashini anglatmaydi (trottling mavjud).",
                "Dasturiy ta'minot: Tizim optimizatsiyasi va yangilanishlar benchmark ballaridan ko'ra real hayotda muhimroq bo'lishi mumkin."
            ],
            "top_ranking": top_phones
        }
        self._send_json(overview)

    def handle_get_stats(self):
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) as count FROM smartphones")
        total_phones = cursor.fetchone()["count"]

        cursor.execute("SELECT COUNT(*) as count FROM smartphones WHERE brand = 'Apple'")
        iphone_count = cursor.fetchone()["count"]

        cursor.execute("SELECT COUNT(*) as count FROM smartphones WHERE brand = 'Samsung'")
        samsung_count = cursor.fetchone()["count"]

        cursor.execute("SELECT MAX(total_score) as max_score FROM antutu_benchmarks")
        max_antutu = cursor.fetchone()["max_score"]

        cursor.execute("SELECT COUNT(*) as count FROM smartphones WHERE category = 'flagman'")
        flagman_count = cursor.fetchone()["count"]

        cursor.execute("SELECT COUNT(*) as count FROM smartphones WHERE category = 'orta'")
        orta_count = cursor.fetchone()["count"]

        cursor.execute("SELECT COUNT(*) as count FROM smartphones WHERE category = 'budjet'")
        budjet_count = cursor.fetchone()["count"]

        conn.close()
        self._send_json({
            "total_phones": total_phones,
            "apple_count": iphone_count,
            "samsung_count": samsung_count,
            "max_antutu": max_antutu,
            "categories": {
                "flagman": flagman_count,
                "orta": orta_count,
                "budjet": budjet_count
            }
        })

    # ------------------ ADMIN ACTIONS ------------------
    def handle_create_smartphone(self, body):
        phone_id = body.get("id") or str(uuid.uuid4())[:8]
        name = body.get("name")
        brand = body.get("brand", "Samsung")
        series = body.get("series", "Galaxy S")
        category = body.get("category", "flagman")
        release_year = int(body.get("release_year", 2024))
        release_date = body.get("release_date", "2024-01-01")
        image_url = body.get("image_url", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s24-ultra-5g-sm-s928-stylus.jpg")
        colors = body.get("colors", ["Qora", "Kumush"])

        specs = body.get("specs", {})
        antutu = body.get("antutu", {})
        market = body.get("market", {})

        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
        INSERT INTO smartphones (id, name, brand, series, category, release_year, release_date, image_url, colors_json, is_featured, views)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
        """, (phone_id, name, brand, series, category, release_year, release_date, image_url, json.dumps(colors)))

        cursor.execute("""
        INSERT INTO specifications (
            phone_id, display_size, display_tech, resolution, refresh_rate,
            chipset, chipset_manufacturer, cpu_arch, cpu_cores, max_clock, process_node,
            gpu, processor_explanation, main_camera, front_camera, camera_features,
            battery_mah, charging_speed, os, ram, storage, dimensions, weight, water_resistance
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            phone_id,
            specs.get("display_size", "6.7 dyuym"),
            specs.get("display_tech", "AMOLED"),
            specs.get("resolution", "1080 x 2400"),
            specs.get("refresh_rate", "120Hz"),
            specs.get("chipset", "Protsessor"),
            specs.get("chipset_manufacturer", brand),
            specs.get("cpu_arch", "8 yadroli"),
            int(specs.get("cpu_cores", 8)),
            specs.get("max_clock", "3.0 GHz"),
            specs.get("process_node", "4 nm"),
            specs.get("gpu", "Adreno"),
            specs.get("processor_explanation", "Yuqori unumdorlikka ega protsessor."),
            specs.get("main_camera", "50 MP"),
            specs.get("front_camera", "12 MP"),
            specs.get("camera_features", "OIS"),
            int(specs.get("battery_mah", 5000)),
            specs.get("charging_speed", "25W"),
            specs.get("os", "Android"),
            specs.get("ram", "8 GB"),
            specs.get("storage", "128 GB"),
            specs.get("dimensions", "160 x 75 x 8 mm"),
            specs.get("weight", "190 g"),
            specs.get("water_resistance", "IP68")
        ))

        cursor.execute("""
        INSERT INTO antutu_benchmarks (
            phone_id, total_score, cpu_score, gpu_score, mem_score, ux_score, version, tested_date, source, verified
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        """, (
            phone_id,
            int(antutu.get("total_score", 1000000)),
            int(antutu.get("cpu_score", 300000)),
            int(antutu.get("gpu_score", 400000)),
            int(antutu.get("mem_score", 200000)),
            int(antutu.get("ux_score", 100000)),
            antutu.get("version", "v10.3"),
            antutu.get("tested_date", "2024-11-01"),
            antutu.get("source", "AnTuTu Benchmark")
        ))

        p_new = int(market.get("price_new_uzs", 5000000))
        p_new_fmt = f"{p_new:,}".replace(",", " ") + " so'm" if p_new > 0 else "Mavjud emas"
        cursor.execute("""
        INSERT INTO market_prices (
            phone_id, price_new_uzs, price_new_formatted, new_shops_json,
            price_used_avg_uzs, price_used_excellent_uzs, price_used_good_uzs, price_used_fair_uzs,
            market_notes, last_updated, sources_links_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            phone_id,
            p_new,
            p_new_fmt,
            json.dumps(market.get("new_shops", ["Malika bozori", "Texnomart"])),
            int(market.get("price_used_avg_uzs", p_new * 0.8)),
            int(market.get("price_used_excellent_uzs", p_new * 0.85)),
            int(market.get("price_used_good_uzs", p_new * 0.78)),
            int(market.get("price_used_fair_uzs", p_new * 0.70)),
            market.get("market_notes", "O'zbekiston bozorida mavjud."),
            market.get("last_updated", "2024-11-20"),
            json.dumps(market.get("sources_links", []))
        ))

        conn.commit()
        conn.close()
        self._send_json({"success": True, "id": phone_id, "message": "Smartfon muvaffaqiyatli qo'shildi!"})

    def handle_update_smartphone(self, phone_id, body):
        conn = get_connection()
        cursor = conn.cursor()

        # Update main fields
        if "name" in body:
            cursor.execute("UPDATE smartphones SET name = ? WHERE id = ?", (body["name"], phone_id))
        if "image_url" in body:
            cursor.execute("UPDATE smartphones SET image_url = ? WHERE id = ?", (body["image_url"], phone_id))
        if "category" in body:
            cursor.execute("UPDATE smartphones SET category = ? WHERE id = ?", (body["category"], phone_id))

        # Update AnTuTu
        if "antutu" in body:
            ant = body["antutu"]
            cursor.execute("""
            UPDATE antutu_benchmarks SET
                total_score = COALESCE(?, total_score),
                cpu_score = COALESCE(?, cpu_score),
                gpu_score = COALESCE(?, gpu_score),
                mem_score = COALESCE(?, mem_score),
                ux_score = COALESCE(?, ux_score),
                version = COALESCE(?, version),
                tested_date = COALESCE(?, tested_date)
            WHERE phone_id = ?
            """, (
                ant.get("total_score"), ant.get("cpu_score"), ant.get("gpu_score"),
                ant.get("mem_score"), ant.get("ux_score"), ant.get("version"),
                ant.get("tested_date"), phone_id
            ))

        # Update Market Prices
        if "market" in body:
            m = body["market"]
            p_new = m.get("price_new_uzs")
            p_new_fmt = None
            if p_new is not None:
                p_new_fmt = f"{int(p_new):,}".replace(",", " ") + " so'm" if int(p_new) > 0 else "Mavjud emas"

            cursor.execute("""
            UPDATE market_prices SET
                price_new_uzs = COALESCE(?, price_new_uzs),
                price_new_formatted = COALESCE(?, price_new_formatted),
                price_used_avg_uzs = COALESCE(?, price_used_avg_uzs),
                price_used_excellent_uzs = COALESCE(?, price_used_excellent_uzs),
                price_used_good_uzs = COALESCE(?, price_used_good_uzs),
                price_used_fair_uzs = COALESCE(?, price_used_fair_uzs),
                market_notes = COALESCE(?, market_notes),
                last_updated = ?
            WHERE phone_id = ?
            """, (
                p_new, p_new_fmt,
                m.get("price_used_avg_uzs"),
                m.get("price_used_excellent_uzs"),
                m.get("price_used_good_uzs"),
                m.get("price_used_fair_uzs"),
                m.get("market_notes"),
                m.get("last_updated", "2024-11-20"),
                phone_id
            ))

        # Update Specs
        if "specs" in body:
            sp = body["specs"]
            cursor.execute("""
            UPDATE specifications SET
                chipset = COALESCE(?, chipset),
                processor_explanation = COALESCE(?, processor_explanation),
                main_camera = COALESCE(?, main_camera),
                battery_mah = COALESCE(?, battery_mah),
                charging_speed = COALESCE(?, charging_speed)
            WHERE phone_id = ?
            """, (
                sp.get("chipset"), sp.get("processor_explanation"),
                sp.get("main_camera"), sp.get("battery_mah"), sp.get("charging_speed"),
                phone_id
            ))

        conn.commit()
        conn.close()
        self._send_json({"success": True, "message": "Ma'lumotlar muvaffaqiyatli yangilandi!"})

    def handle_delete_smartphone(self, phone_id):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM specifications WHERE phone_id = ?", (phone_id,))
        cursor.execute("DELETE FROM antutu_benchmarks WHERE phone_id = ?", (phone_id,))
        cursor.execute("DELETE FROM market_prices WHERE phone_id = ?", (phone_id,))
        cursor.execute("DELETE FROM smartphones WHERE id = ?", (phone_id,))
        conn.commit()
        conn.close()
        self._send_json({"success": True, "message": f"Smartfon ({phone_id}) muvaffaqiyatli o'chirildi!"})

class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True

def run():
    print(f"PHONE ARENA Server ishga tushmoqda: http://localhost:{PORT}")
    server = ThreadedHTTPServer(("0.0.0.0", PORT), PhoneArenaHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer to'xtatildi.")
        server.server_close()

if __name__ == "__main__":
    run()

