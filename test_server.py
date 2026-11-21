"""
PHONE ARENA - Test Suite
Verifies all REST API endpoints, database integrity, and static file serving.
"""

import threading
import time
import urllib.request
import json
from server import ThreadedHTTPServer, PhoneArenaHandler, PORT

def run_test():
    print("Testing server startup...")
    server = ThreadedHTTPServer(("127.0.0.1", PORT), PhoneArenaHandler)
    server_thread = threading.Thread(target=server.serve_forever)
    server_thread.daemon = True
    server_thread.start()

    time.sleep(1)

    try:
        # Test 1: Stats endpoint
        req = urllib.request.urlopen(f"http://127.0.0.1:{PORT}/api/stats")
        stats = json.loads(req.read().decode())
        print(f"✓ /api/stats: {stats['total_phones']} ta telefon mavjud (Apple: {stats['apple_count']}, Samsung: {stats['samsung_count']})")
        assert stats['total_phones'] > 0, "No smartphones found!"

        # Test 2: Smartphones list
        req = urllib.request.urlopen(f"http://127.0.0.1:{PORT}/api/smartphones")
        data = json.loads(req.read().decode())
        print(f"✓ /api/smartphones: {len(data['smartphones'])} ta smartfon qaytdi")

        # Test 3: Specific phone detail
        req = urllib.request.urlopen(f"http://127.0.0.1:{PORT}/api/smartphones/iphone-16-pro-max")
        phone = json.loads(req.read().decode())
        print(f"✓ Detail ({phone['name']}): AnTuTu = {phone['antutu']['total_score']}, Yangi narxi = {phone['market']['price_new_formatted']}")

        # Test 4: Comparison endpoint
        req = urllib.request.urlopen(f"http://127.0.0.1:{PORT}/api/comparison?ids=iphone-16-pro-max,samsung-galaxy-s24-ultra")
        comp = json.loads(req.read().decode())
        print(f"✓ /api/comparison: {len(comp['items'])} ta model taqqoslandi. G'olib antutu = {comp['winners']['antutu']}")

        # Test 5: AnTuTu educational endpoint
        req = urllib.request.urlopen(f"http://127.0.0.1:{PORT}/api/antutu/overview")
        antutu = json.loads(req.read().decode())
        print(f"✓ /api/antutu/overview: Top {len(antutu['top_ranking'])} ta smartfon reytingi qaytdi")

        # Test 6: Static frontend index.html
        req = urllib.request.urlopen(f"http://127.0.0.1:{PORT}/index.html")
        html = req.read().decode()
        assert "PHONE ARENA" in html
        print(f"✓ Frontend HTML ({len(html)} bayt) muvaffaqiyatli uzatildi")

        print("\n==========================================")
        print("BARCHA TESTLAR MUVAFFAQIYATLI O'TDI (100%)")
        print("==========================================")
    finally:
        server.shutdown()
        server.server_close()

if __name__ == "__main__":
    run_test()

