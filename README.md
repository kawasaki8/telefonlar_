# PHONE ARENA — Professional Smartfon Axborot Portali

**PHONE ARENA** — O'zbekiston foydalanuvchilari uchun maxsus ishlab chiqilgan zamonaviy, to'liq funksional va yuqori darajadagi smartfon axborot veb-sayti.

Loyiha to'liq o'zbek tilida (lotin alifbosida), qorong'i (dark/graphite) kibernetik dizaynda yaratilgan bo'lib, eng so'nggi mobil protsessorlar, AnTuTu benchmark natijalari va O'zbekiston bozoridagi haqiqiy narxlarni jamlagan.

---

## 🌟 ASOSIY IMKONIYATLAR VA XUSUSIYATLAR

### 1. Dizayn va Tashqi Ko'rinish
- **Dark Graphite & Cyberpunk Neon**: Qora va grafit fon, ko'k, siyohrang va neon tsian urg'ulari.
- **Glassmorphism**: Shaffof va xiralashtirilgan zamonaviy oynaviy panellar (`backdrop-blur`).
- **Responsive Dizayn**: Kompyuter, noutbuk, planshet va smartfon ekranlariga to'liq moslashuvchan.
- **Yuqori sifatli fotosuratlar**: Har bir smartfonning original renderlari va ko'rinishlari.

### 2. Smartfonlar Katalogi
- **Apple iPhone (Barcha Avlodlar)**:
  - Ilk inqilobiy iPhone 2G (2007) dan boshlab eng so'nggi iPhone 16 Pro Max gacha;
  - Pro Max, Pro, Plus, Standart, Mini hamda SE modellarining to'liq katalogi.
- **Samsung Galaxy (3 ta alohida seriya)**:
  - **S Series**: Galaxy S24 Ultra, S24+, S24, S24 FE, S23 Ultra, S22, S21, S20, S10+, S7 Edge va barcha FE modellari;
  - **Z Series**: Galaxy Z Fold 6, Z Flip 6, Z Fold 5, Z Flip 3, Galaxy Fold;
  - **A Series**: Galaxy A55 5G, A35, A25, A15, A05s, A73, A54, A52s, A12 va boshqalar.

### 3. Smartfonlar Tasnifi (Klassifikatsiya)
- **Eng kuchli flagmanlar**: 1 500 000+ AnTuTu balli, AAA o'yinlar va sun'iy intellekt uchun.
- **O'rta segment**: Narx va unumdorlikning eng maqbul muvozanati.
- **Boshlang'ich budjet**: Kundalik aloqa, ta'lim, taksi va xalqona modellar.

### 4. Smartfon Batafsil Ma'lumot Sahifasi
1. **Rasm galereyasi va ranglar tanlovi**.
2. **Protsessor tahlili**: Chipset nomi, ishlab chiqaruvchi, arxitektura, yadrolar soni, maksimal chastota, GPU, nanometr (nm) va o'zbek tilidagi tushunarli unumdorlik sharhi.
3. **AnTuTu Benchmark**: Jami ball, CPU, GPU, MEM va UX ballari, progress-barlar, benchmark versiyasi va AnTuTu tushuntirishi.
4. **To'liq Texnik Parametrlar**: Displey o'lchami, texnologiyasi, yangilanish tezligi (Hz), asosiy va old kameralar, batareya sig'imi, zaryad tezligi, OS, RAM, ROM, o'lcham va suv himoyasi.
5. **O'zbekiston Bozoridagi Narxlar**:
   - **Yangi telefon**: So'mda narx, do'kon manbalari (Malika bozori, Texnomart, MediaPark, MacBro, Uzum Market).
   - **Ishlatilgan telefon**: O'rtacha bozor narxi hamda 3 ta holat bo'yicha taqsimot:
     - *A'lo holat (Ideal)*
     - *Yaxshi holat*
     - *O'rtacha holat*
   - Narxlarning so'nggi yangilangan sanasi.

### 5. Smartfonlarni Taqqoslash (Comparator)
- Bir vaqtning o'zida **2 yoki 3 ta smartfonni** parametrlar bo'yicha solishtirish.
- Har bir ko'rsatkich (AnTuTu, GPU, Batareya, Narx) bo'yicha **g'olib modelni yashil nishon bilan ko'rsatish**.
- O'zbek tilidagi **Ekspert Xulosasi** (O'yinlar uchun, suratga olish uchun va eng yaxshi narx/sifat).

### 6. AnTuTu Ta'limiy Sahifasi
- "ANTUTU NIMA VA U QANDAY ISHLAYDI?"
- CPU, GPU, MEM va UX qismlarining vazifalari.
- Ballar klassifikatsiyasi va nima uchun faqat benchmarkka qarab telefon tanlamaslik kerakligi.
- Top-10 eng kuchli smartfonlar ro'yxati.

### 7. Himoyalangan Admin Panel
- **Kirish**: PIN kod orqali himoyalangan (Standart PIN: `7777`).
- Yangi smartfon qo'shish (barcha texnik parametrlar, AnTuTu ballari va narxlar bilan).
- Mavjud smartfon ma'lumotlarini va narxlarini 1-klikda yangilash.
- Smartfonlarni o'chirish.

---

## 🚀 ISHGA TUSHIRISH BO'YICHA YO'RIQNOMA

### 1-usul: Tayyor bat fayl orqali (eng oson)
Ildiz papkadagi `start.bat` faylini ikki marta bosing. U serverni ishga tushiradi va brauzeringizda avtomatik ochadi:
```bash
start.bat
```

### 2-usul: Python orqali ishga tushirish
```bash
python server.py
```
Brauzerda quyidagi manzilni oching:
👉 **http://localhost:5050**

---

## 🔐 ADMIN PANELIGA KIRISH

1. Saytning yuqori o'ng burchagidagi **"Admin Panel"** tugmasini bosing.
2. Standart PIN kodni kiriting:
   ```
   7777
   ```
3. Muvaffaqiyatli kirgach, yangi telefonlar qo'shishingiz, narxlar va AnTuTu natijalarini istalgan payt yangilashingiz mumkin.

---

## 📂 LOYIHA TUZILISHI

```
c:\telefonlar_\
├── server.py              # Yuqori unumdor ko'p oqimli REST API va Web Server
├── database.py            # SQLite ma'lumotlar bazasi sxemasi va boshqaruvi
├── seed_data.py           # Asosiy katalog ma'lumotlarini kirituvchi skript
├── seed_more.py           # Tarixiy modellar (iPhone 2G, S7 Edge, Fold 1 va h.k.)
├── test_in_memory.py      # Tizim testlari va tekshiruv skripti
├── start.bat              # 1-klikda ishga tushirish uchun Windows skripti
├── phone_arena.db         # To'liq SQLite ma'lumotlar bazasi (51+ model)
├── README.md              # Loyiha hujjatlari
└── public/
    ├── index.html         # Zamonaviy veb-interfeys (HTML5, Tailwind, Lucide)
    ├── css/
    │   └── style.css      # Dark grafit neon dizayn, glassmorphism va animatsiyalar
    └── js/
        ├── api.js         # REST API mijoz moduli
        └── app.js         # Dinamik interfeys, router, taqqoslagich va admin moduli
```

---

*PHONE ARENA — O'zbekiston texnologiya ixlosmandlari uchun yaratilgan mustahkam va ishonchli smartfon axborot tizimi.*

