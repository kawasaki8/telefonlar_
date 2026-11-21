/**
 * PHONE ARENA - Core Frontend Application
 * Handles state management, dynamic routing, filters, comparison, AnTuTu guides, and admin CRUD.
 */

const App = {
  state: {
    currentView: 'home', // home, apple, samsung, compare, antutu, admin
    smartphones: [],
    loading: false,
    filters: {
      brand: 'all',
      series: 'all',
      category: 'all',
      q: '',
      sort: 'antutu_desc',
      min_price: '',
      max_price: '',
      min_antutu: ''
    },
    stats: null,
    comparisonIds: [],
    isAdmin: false,
    selectedPhone: null
  },

  async init() {
    this.initLucide();
    this.loadComparisonFromStorage();
    await this.checkAdminStatus();
    await this.loadStats();
    await this.loadSmartphones();
    this.render();
  },

  initLucide() {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  },

  loadComparisonFromStorage() {
    try {
      const saved = localStorage.getItem('phone_arena_comparison');
      if (saved) {
        this.state.comparisonIds = JSON.parse(saved);
        this.updateComparisonTray();
      }
    } catch (e) {
      this.state.comparisonIds = [];
    }
  },

  saveComparisonToStorage() {
    localStorage.setItem('phone_arena_comparison', JSON.stringify(this.state.comparisonIds));
    this.updateComparisonTray();
  },

  async checkAdminStatus() {
    this.state.isAdmin = await API.checkAdminAuth();
  },

  async loadStats() {
    try {
      this.state.stats = await API.getStats();
    } catch (e) {
      console.warn("Stats yuklanmadi:", e);
    }
  },

  async loadSmartphones() {
    this.state.loading = true;
    this.renderLoading();
    try {
      const res = await API.getSmartphones(this.state.filters);
      this.state.smartphones = res.smartphones || [];
    } catch (e) {
      this.showToast("Ma'lumotlarni yuklashda xatolik: " + e.message, "error");
    } finally {
      this.state.loading = false;
      this.render();
    }
  },

  navigate(view, extraParam = null) {
    this.state.currentView = view;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Close mobile menu if open
    document.getElementById('mobile-menu')?.classList.add('hidden');

    // Update active nav link classes
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('text-cyan-400', 'bg-white/10'));
    if (view === 'home') document.getElementById('nav-home')?.classList.add('text-cyan-400', 'bg-white/10');
    if (view === 'apple') document.getElementById('nav-apple')?.classList.add('text-cyan-400', 'bg-white/10');
    if (view === 'samsung') document.getElementById('nav-samsung')?.classList.add('text-cyan-400', 'bg-white/10');
    if (view === 'compare') document.getElementById('nav-compare')?.classList.add('text-cyan-400', 'bg-white/10');
    if (view === 'antutu') document.getElementById('nav-antutu')?.classList.add('text-cyan-400', 'bg-white/10');

    if (view === 'apple') {
      this.state.filters.brand = 'Apple';
      this.state.filters.series = 'all';
      this.loadSmartphones();
    } else if (view === 'samsung') {
      this.state.filters.brand = 'Samsung';
      if (extraParam) {
        this.state.filters.series = extraParam;
      }
      this.loadSmartphones();
    } else if (view === 'home') {
      this.state.filters.brand = 'all';
      this.state.filters.series = 'all';
      this.loadSmartphones();
    } else {
      this.render();
    }
  },

  filterByBrand(brand) {
    if (brand === 'Apple') {
      this.navigate('apple');
    } else if (brand === 'Samsung') {
      this.navigate('samsung');
    } else {
      this.state.filters.brand = 'all';
      this.state.filters.series = 'all';
      this.navigate('home');
    }
  },

  filterBySeries(series) {
    this.state.filters.brand = 'Samsung';
    this.state.filters.series = series;
    this.navigate('samsung', series);
  },

  filterByCategory(cat) {
    this.state.filters.category = cat;
    this.loadSmartphones();
  },

  setSort(sortKey) {
    this.state.filters.sort = sortKey;
    this.loadSmartphones();
  },

  onSearchInput(e) {
    clearTimeout(this._searchTimer);
    const val = e.target.value;
    this._searchTimer = setTimeout(() => {
      this.state.filters.q = val;
      this.loadSmartphones();
    }, 350);
  },

  focusSearch() {
    if (this.state.currentView !== 'home') {
      this.navigate('home');
      setTimeout(() => {
        const input = document.getElementById('hero-search-input');
        if (input) {
          input.focus();
          input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 200);
    } else {
      const input = document.getElementById('hero-search-input');
      if (input) {
        input.focus();
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  },

  toggleMobileMenu() {
    const el = document.getElementById('mobile-menu');
    if (el) el.classList.toggle('hidden');
  },

  // ==========================================
  // COMPARISON SYSTEM
  // ==========================================
  toggleComparison(phoneId, event) {
    if (event) event.stopPropagation();
    const idx = this.state.comparisonIds.indexOf(phoneId);
    if (idx > -1) {
      this.state.comparisonIds.splice(idx, 1);
      this.showToast("Taqqoslagichdan o'chirildi", "info");
    } else {
      if (this.state.comparisonIds.length >= 3) {
        this.showToast("Maksimal 3 ta smartfonni bir vaqtda taqqoslay olasiz!", "warning");
        return;
      }
      this.state.comparisonIds.push(phoneId);
      this.showToast("Taqqoslagichga qo'shildi", "success");
    }
    this.saveComparisonToStorage();
    this.render();
  },

  clearComparison() {
    this.state.comparisonIds = [];
    this.saveComparisonToStorage();
    if (this.state.currentView === 'compare') {
      this.navigate('home');
    } else {
      this.render();
    }
  },

  updateComparisonTray() {
    const tray = document.getElementById('comparison-tray');
    const badge = document.getElementById('compare-counter-badge');
    const countEl = document.getElementById('tray-count');
    const thumbContainer = document.getElementById('tray-thumbnails');

    const count = this.state.comparisonIds.length;

    if (badge) {
      badge.textContent = count;
      if (count > 0) badge.classList.remove('hidden');
      else badge.classList.add('hidden');
    }

    if (count > 0 && this.state.currentView !== 'compare') {
      tray?.classList.remove('hidden');
      if (countEl) countEl.textContent = count;

      if (thumbContainer) {
        thumbContainer.innerHTML = this.state.comparisonIds.map(id => {
          const p = this.state.smartphones.find(x => x.id === id);
          const img = p ? p.image_url : 'https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-16-pro-max.jpg';
          return `<img src="${img}" class="w-8 h-8 rounded-full border-2 border-slate-900 object-cover bg-slate-800" alt="phone">`;
        }).join('');
      }
    } else {
      tray?.classList.add('hidden');
    }
  },

  // ==========================================
  // TOAST NOTIFICATIONS
  // ==========================================
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `px-4 py-3 rounded-xl shadow-2xl border text-xs font-semibold flex items-center gap-3 transition-all transform duration-300 pointer-events-auto bg-slate-900/95 backdrop-blur-md`;

    let iconName = 'info';
    let borderColor = 'border-blue-500/40 text-blue-300';
    if (type === 'success') {
      iconName = 'check-circle';
      borderColor = 'border-emerald-500/40 text-emerald-300';
    } else if (type === 'error') {
      iconName = 'alert-triangle';
      borderColor = 'border-rose-500/40 text-rose-300';
    } else if (type === 'warning') {
      iconName = 'alert-circle';
      borderColor = 'border-amber-500/40 text-amber-300';
    }

    toast.className += ` ${borderColor}`;
    toast.innerHTML = `<i data-lucide="${iconName}" class="w-4 h-4"></i> <span>${message}</span>`;
    container.appendChild(toast);
    this.initLucide();

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-x-4');
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  },

  // ==========================================
  // DETAIL MODAL
  // ==========================================
  async openDetail(phoneId) {
    const modal = document.getElementById('detail-modal');
    const content = document.getElementById('detail-content');
    if (!modal || !content) return;

    content.innerHTML = `
      <div class="p-12 text-center">
        <div class="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-400"></div>
        <p class="mt-4 text-xs text-slate-400">Smartfon ma'lumotlari yuklanmoqda...</p>
      </div>
    `;
    modal.classList.remove('hidden');

    try {
      const data = await API.getSmartphoneDetail(phoneId);
      this.state.selectedPhone = data;
      this.renderDetailContent(data);
    } catch (e) {
      content.innerHTML = `
        <div class="p-8 text-center text-rose-400">
          <i data-lucide="alert-triangle" class="w-8 h-8 mx-auto mb-2"></i>
          <p>${e.message}</p>
          <button onclick="App.closeDetailModal()" class="mt-4 px-4 py-2 bg-white/10 rounded-lg text-white text-xs">Yopish</button>
        </div>
      `;
      this.initLucide();
    }
  },

  closeDetailModal() {
    const modal = document.getElementById('detail-modal');
    if (modal) modal.classList.add('hidden');
    this.state.selectedPhone = null;
  },

  renderDetailContent(p) {
    const content = document.getElementById('detail-content');
    if (!content) return;

    const isCompared = this.state.comparisonIds.includes(p.id);
    const antutuTotalFmt = p.antutu.total_score ? p.antutu.total_score.toLocaleString() : "N/A";
    const newPriceFmt = p.market.price_new_uzs > 0 ? `${p.market.price_new_uzs.toLocaleString()} so'm` : "Ishlab chiqarish to'xtatilgan";
    const usedAvgFmt = p.market.price_used_avg_uzs > 0 ? `${p.market.price_used_avg_uzs.toLocaleString()} so'm` : "N/A";

    content.innerHTML = `
      <!-- Modal Header -->
      <div class="flex items-center justify-between pb-6 border-b border-white/10">
        <div class="flex items-center gap-3">
          <span class="px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider ${
            p.category === 'flagman' ? 'badge-flagman' : (p.category === 'orta' ? 'badge-orta' : 'badge-budjet')
          }">
            ${p.category === 'flagman' ? 'Eng kuchli flagman' : (p.category === 'orta' ? 'O\'rta segment' : 'Boshlang\'ich budjet')}
          </span>
          <span class="text-xs text-slate-400">${p.brand} • ${p.series} (${p.release_year})</span>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="App.toggleComparison('${p.id}')" class="px-3.5 py-1.5 rounded-xl text-xs font-semibold border ${
            isCompared ? 'bg-cyan-500 text-black border-cyan-400' : 'bg-white/5 border-white/10 text-slate-300 hover:text-cyan-400'
          } transition-all flex items-center gap-1.5">
            <i data-lucide="${isCompared ? 'check' : 'scale'}" class="w-3.5 h-3.5"></i>
            <span>${isCompared ? 'Taqqoslanmoqda' : 'Taqqoslashga qo\'shish'}</span>
          </button>
          <button onclick="App.closeDetailModal()" class="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>
      </div>

      <div class="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <!-- A. Left Column: Phone Image & Quick Badges -->
        <div class="lg:col-span-5 flex flex-col items-center">
          <div class="relative w-full aspect-[4/5] rounded-2xl glass-card flex items-center justify-center p-8 overflow-hidden group">
            <div class="absolute inset-0 bg-gradient-to-t from-cyan-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <img src="${p.image_url}" alt="${p.name}" class="max-h-full max-w-full object-contain filter drop-shadow-[0_20px_30px_rgba(0,0,0,0.8)] transform group-hover:scale-105 transition-transform duration-500">
            <div class="absolute bottom-4 left-4 right-4 flex items-center justify-between text-[11px] text-slate-400 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/5">
              <span>Ko'rishlar soni: ${p.views + 1}</span>
              <span class="text-cyan-400">${p.release_date}</span>
            </div>
          </div>

          <!-- Color options -->
          ${p.colors && p.colors.length ? `
            <div class="mt-4 w-full glass-panel p-3 rounded-xl border border-white/5">
              <span class="text-[11px] text-slate-400 font-semibold block mb-2">Mavjud ranglar:</span>
              <div class="flex flex-wrap gap-1.5">
                ${p.colors.map(c => `<span class="px-2 py-0.5 rounded text-[10px] bg-white/5 text-slate-300 border border-white/5">${c}</span>`).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Benchmark Badge Card -->
          <div class="mt-4 w-full p-4 rounded-xl bg-gradient-to-br from-orange-500/15 via-red-500/10 to-transparent border border-orange-500/30">
            <div class="flex items-center justify-between">
              <div>
                <span class="text-[11px] text-orange-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <i data-lucide="flame" class="w-3.5 h-3.5"></i> AnTuTu Benchmark
                </span>
                <div class="text-2xl font-black text-white mt-1">${antutuTotalFmt} <span class="text-xs font-normal text-slate-400">ball</span></div>
              </div>
              <span class="px-2 py-1 rounded bg-orange-500/20 text-orange-300 text-xs font-mono font-semibold">${p.antutu.version}</span>
            </div>
            <p class="text-[10px] text-slate-400 mt-2">Tekshirilgan manba: ${p.antutu.source}</p>
          </div>
        </div>

        <!-- Right Column: Specs, Protsessor, AnTuTu Breakdown & Bozor Narxlari -->
        <div class="lg:col-span-7 space-y-6">
          <div>
            <h2 class="text-2xl sm:text-3xl font-extrabold text-white">${p.name}</h2>
            <p class="text-xs text-slate-400 mt-1">${p.specs.processor.chipset} • ${p.specs.display.size} • ${p.specs.camera.main}</p>
          </div>

          <!-- B. PROCESSOR INFORMATION -->
          <div class="glass-panel p-5 rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-950/20 to-slate-900/50">
            <div class="flex items-center gap-2 mb-3">
              <div class="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <i data-lucide="cpu" class="w-4 h-4"></i>
              </div>
              <h3 class="text-sm font-bold text-white uppercase tracking-wider">Protsessor va Kuch-Quvvat</h3>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs mb-3">
              <div class="p-2.5 rounded-xl bg-white/5">
                <span class="text-[10px] text-slate-400 block">Chipset</span>
                <span class="font-bold text-slate-200">${p.specs.processor.chipset}</span>
              </div>
              <div class="p-2.5 rounded-xl bg-white/5">
                <span class="text-[10px] text-slate-400 block">Ishlab chiqaruvchi</span>
                <span class="font-bold text-slate-200">${p.specs.processor.manufacturer}</span>
              </div>
              <div class="p-2.5 rounded-xl bg-white/5">
                <span class="text-[10px] text-slate-400 block">Texnologik jarayon</span>
                <span class="font-bold text-cyan-400">${p.specs.processor.process_node}</span>
              </div>
              <div class="p-2.5 rounded-xl bg-white/5">
                <span class="text-[10px] text-slate-400 block">Yadrolar & Chastota</span>
                <span class="font-bold text-slate-200">${p.specs.processor.cpu_cores} yadro / ${p.specs.processor.max_clock}</span>
              </div>
              <div class="p-2.5 rounded-xl bg-white/5">
                <span class="text-[10px] text-slate-400 block">Grafik chip (GPU)</span>
                <span class="font-bold text-purple-400">${p.specs.processor.gpu}</span>
              </div>
              <div class="p-2.5 rounded-xl bg-white/5">
                <span class="text-[10px] text-slate-400 block">Arxitektura</span>
                <span class="font-bold text-slate-200">${p.specs.processor.cpu_arch}</span>
              </div>
            </div>
            <!-- Protsessor unumdorligi sharhi -->
            <div class="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-xs text-slate-300 leading-relaxed">
              <strong class="text-cyan-300 font-semibold block mb-1">Protsessor unumdorligi tavsifi:</strong>
              ${p.specs.processor.explanation}
            </div>
          </div>

          <!-- C. ANTUTU BENCHMARK DETAILED BREAKDOWN -->
          <div class="glass-panel p-5 rounded-2xl border border-white/10">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2">
                <div class="p-1.5 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  <i data-lucide="bar-chart-3" class="w-4 h-4"></i>
                </div>
                <h3 class="text-sm font-bold text-white uppercase tracking-wider">AnTuTu Sinov Tafsilotlari</h3>
              </div>
              <span class="text-xs text-slate-400">Sana: ${p.antutu.tested_date}</span>
            </div>

            <!-- Progress Bars for CPU, GPU, MEM, UX -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div class="p-3 rounded-xl bg-white/5">
                <div class="flex justify-between text-xs mb-1">
                  <span class="text-slate-300">CPU (Hisoblash):</span>
                  <span class="font-mono font-bold text-cyan-400">${p.antutu.cpu_score.toLocaleString()} ball</span>
                </div>
                <div class="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div class="bg-gradient-to-r from-cyan-500 to-blue-500 h-full antutu-bar" style="width: ${Math.min(100, (p.antutu.cpu_score / 600000) * 100)}%"></div>
                </div>
              </div>

              <div class="p-3 rounded-xl bg-white/5">
                <div class="flex justify-between text-xs mb-1">
                  <span class="text-slate-300">GPU (Grafika/O'yin):</span>
                  <span class="font-mono font-bold text-purple-400">${p.antutu.gpu_score.toLocaleString()} ball</span>
                </div>
                <div class="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div class="bg-gradient-to-r from-purple-500 to-pink-500 h-full antutu-bar" style="width: ${Math.min(100, (p.antutu.gpu_score / 850000) * 100)}%"></div>
                </div>
              </div>

              <div class="p-3 rounded-xl bg-white/5">
                <div class="flex justify-between text-xs mb-1">
                  <span class="text-slate-300">MEM (Xotira tezligi):</span>
                  <span class="font-mono font-bold text-amber-400">${p.antutu.mem_score.toLocaleString()} ball</span>
                </div>
                <div class="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div class="bg-gradient-to-r from-amber-500 to-yellow-500 h-full antutu-bar" style="width: ${Math.min(100, (p.antutu.mem_score / 450000) * 100)}%"></div>
                </div>
              </div>

              <div class="p-3 rounded-xl bg-white/5">
                <div class="flex justify-between text-xs mb-1">
                  <span class="text-slate-300">UX (Foydalanish qulayligi):</span>
                  <span class="font-mono font-bold text-emerald-400">${p.antutu.ux_score.toLocaleString()} ball</span>
                </div>
                <div class="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div class="bg-gradient-to-r from-emerald-500 to-teal-500 h-full antutu-bar" style="width: ${Math.min(100, (p.antutu.ux_score / 350000) * 100)}%"></div>
                </div>
              </div>
            </div>

            <!-- AnTuTu Explainer in Uzbek -->
            <div class="p-3 rounded-xl bg-slate-900/80 border border-white/5 text-[11px] text-slate-400 leading-relaxed">
              <strong class="text-slate-200">AnTuTu nima?</strong> AnTuTu — smartfonlarning protsessor, grafik protsessor, xotira va umumiy ishlash tezligini sinovdan o'tkazadigan benchmark platformasi. U telefonning ishlash unumdorligini ball orqali baholaydi. Yuqori ball og'ir vazifalarga bardoshlilikni bildirsa-da, real hayotdagi qulaylik dasturiy ta'minot optimizatsiyasiga ham bog'liq.
            </div>
          </div>

          <!-- 6. O'ZBEKISTON BOZORIDAGI NARXLAR (DEDICATED SECTION) -->
          <div class="glass-panel p-5 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 to-slate-900/50">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2">
                <div class="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <i data-lucide="tag" class="w-4 h-4"></i>
                </div>
                <h3 class="text-sm font-bold text-white uppercase tracking-wider">O'ZBEKISTON BOZORIDAGI NARXLAR</h3>
              </div>
              <span class="text-[10px] text-slate-400 flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Yangilangan: ${p.market.last_updated}
              </span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- YANGI TELEFON -->
              <div class="p-4 rounded-xl bg-slate-900/90 border border-white/10">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-xs font-bold text-emerald-400 uppercase tracking-wider">YANGI TELEFON</span>
                  <span class="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300">Kafolatli</span>
                </div>
                <div class="text-xl font-black text-white">${newPriceFmt}</div>
                <p class="text-[10px] text-slate-400 mt-2">Mavjud do'konlar va manbalar:</p>
                <div class="flex flex-wrap gap-1 mt-1">
                  ${p.market.new_shops && p.market.new_shops.length ? p.market.new_shops.map(sh => `<span class="px-2 py-0.5 text-[10px] rounded bg-white/5 text-slate-300">${sh}</span>`).join('') : '<span class="text-[10px] text-slate-500">Bozorda rasmiy qoldiq yo\'q</span>'}
                </div>
              </div>

              <!-- ISHLATILGAN TELEFON -->
              <div class="p-4 rounded-xl bg-slate-900/90 border border-white/10">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-xs font-bold text-cyan-400 uppercase tracking-wider">ISHLATILGAN TELEFON</span>
                  <span class="text-[10px] text-slate-400">O'rtacha bozor narxi</span>
                </div>
                <div class="text-xl font-black text-cyan-300">${usedAvgFmt}</div>
                
                <!-- Holat bo'yicha narxlar jadvali -->
                <div class="mt-3 space-y-1.5 text-[11px] pt-2 border-t border-white/5">
                  <div class="flex justify-between items-center text-slate-300">
                    <span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> A'lo holat (Ideal):</span>
                    <strong class="text-white">${p.market.price_used_excellent_uzs > 0 ? p.market.price_used_excellent_uzs.toLocaleString() + " so'm" : "N/A"}</strong>
                  </div>
                  <div class="flex justify-between items-center text-slate-300">
                    <span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-blue-400"></span> Yaxshi holat:</span>
                    <strong class="text-white">${p.market.price_used_good_uzs > 0 ? p.market.price_used_good_uzs.toLocaleString() + " so'm" : "N/A"}</strong>
                  </div>
                  <div class="flex justify-between items-center text-slate-300">
                    <span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span> O'rtacha holat:</span>
                    <strong class="text-white">${p.market.price_used_fair_uzs > 0 ? p.market.price_used_fair_uzs.toLocaleString() + " so'm" : "N/A"}</strong>
                  </div>
                </div>
              </div>
            </div>

            ${p.market.market_notes ? `
              <p class="text-[11px] text-slate-400 mt-3 italic">
                <i data-lucide="info" class="w-3.5 h-3.5 inline mr-1 text-cyan-400"></i> ${p.market.market_notes}
              </p>
            ` : ''}
          </div>

          <!-- D. FULL SPECIFICATIONS TABLE -->
          <div class="glass-panel p-5 rounded-2xl border border-white/10">
            <h3 class="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <i data-lucide="settings-2" class="w-4 h-4 text-purple-400"></i> To'liq Texnik Parametrlar
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
              <div class="flex justify-between py-1.5 border-b border-white/5">
                <span class="text-slate-400">Ekran:</span>
                <span class="text-slate-200 text-right font-medium">${p.specs.display.size} ${p.specs.display.tech}</span>
              </div>
              <div class="flex justify-between py-1.5 border-b border-white/5">
                <span class="text-slate-400">Chastota va piksellar:</span>
                <span class="text-slate-200 text-right font-medium">${p.specs.display.refresh_rate} • ${p.specs.display.resolution}</span>
              </div>
              <div class="flex justify-between py-1.5 border-b border-white/5">
                <span class="text-slate-400">Asosiy kamera:</span>
                <span class="text-slate-200 text-right font-medium">${p.specs.camera.main}</span>
              </div>
              <div class="flex justify-between py-1.5 border-b border-white/5">
                <span class="text-slate-400">Old kamera:</span>
                <span class="text-slate-200 text-right font-medium">${p.specs.camera.front}</span>
              </div>
              <div class="flex justify-between py-1.5 border-b border-white/5">
                <span class="text-slate-400">Batareya quvvati:</span>
                <span class="text-slate-200 text-right font-medium">${p.specs.battery.capacity_mah} mAh (${p.specs.battery.charging_speed})</span>
              </div>
              <div class="flex justify-between py-1.5 border-b border-white/5">
                <span class="text-slate-400">Operatsion tizim:</span>
                <span class="text-slate-200 text-right font-medium">${p.specs.system.os}</span>
              </div>
              <div class="flex justify-between py-1.5 border-b border-white/5">
                <span class="text-slate-400">Xotira (RAM / ROM):</span>
                <span class="text-slate-200 text-right font-medium">${p.specs.system.ram} / ${p.specs.system.storage}</span>
              </div>
              <div class="flex justify-between py-1.5 border-b border-white/5">
                <span class="text-slate-400">O'lcham va Og'irlik:</span>
                <span class="text-slate-200 text-right font-medium">${p.specs.body.dimensions} • ${p.specs.body.weight}</span>
              </div>
              <div class="flex justify-between py-1.5 border-b border-white/5">
                <span class="text-slate-400">Suv va chang himoyasi:</span>
                <span class="text-cyan-400 text-right font-medium">${p.specs.body.water_resistance}</span>
              </div>
              <div class="flex justify-between py-1.5 border-b border-white/5">
                <span class="text-slate-400">Kamera imkoniyatlari:</span>
                <span class="text-slate-200 text-right font-medium">${p.specs.camera.features || "Standart"}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    `;
    this.initLucide();
  },

  // ==========================================
  // VIEW RENDERERS
  // ==========================================
  renderLoading() {
    const container = document.getElementById('app-container');
    if (!container) return;
    container.innerHTML = `
      <div class="py-24 text-center">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
        <p class="mt-4 text-sm text-slate-400 font-medium tracking-wide">PHONE ARENA ma'lumotlar bazasi yangilanmoqda...</p>
      </div>
    `;
  },

  render() {
    const container = document.getElementById('app-container');
    if (!container) return;

    if (this.state.currentView === 'compare') {
      this.renderCompareView();
    } else if (this.state.currentView === 'antutu') {
      this.renderAntutuView();
    } else if (this.state.currentView === 'admin') {
      this.renderAdminView();
    } else {
      this.renderCatalogView();
    }

    this.updateComparisonTray();
    this.initLucide();
  },

  // CATALOG VIEW (Home, Apple, Samsung)
  renderCatalogView() {
    const container = document.getElementById('app-container');
    if (!container) return;

    const brand = this.state.filters.brand;
    const series = this.state.filters.series;
    const isApple = brand === 'Apple';
    const isSamsung = brand === 'Samsung';

    let heroTitle = "O'ZINGIZGA MOS SMARTFONNI TOPING";
    let heroSubtitle = "Dunyoning eng kuchli smartfonlari, protsessorlari, AnTuTu natijalari va O'zbekiston bozoridagi narxlari — barchasi bir joyda.";

    if (isApple) {
      heroTitle = "APPLE IPHONE — BARCHA AVLODLAR VA MODELLAR";
      heroSubtitle = "Ilk inqilobiy iPhone 2G dan boshlab eng so'nggi iPhone 16 Pro Max flagmanigacha to'liq texnik xususiyatlar va Toshkent narxlari.";
    } else if (isSamsung) {
      heroTitle = `SAMSUNG GALAXY — ${series !== 'all' ? series.toUpperCase() : 'A, Z VA S SERIYALARI'}`;
      heroSubtitle = "Flagman S seriya, buklanadigan Z seriya va xalqona A seriya smartfonlarining AnTuTu ko'rsatkichlari va O'zbekiston narxlari.";
    }

    container.innerHTML = `
      <!-- HERO SECTION -->
      <section class="py-8 md:py-14 text-center relative">
        <div class="max-w-4xl mx-auto space-y-4">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold">
            <span class="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            O'zbekistonning #1 Smartfon Ma'lumotlar Portali
          </div>
          
          <h1 class="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
            ${heroTitle}
          </h1>
          
          <p class="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            ${heroSubtitle}
          </p>

          <!-- Large Interactive Search Bar -->
          <div class="pt-4 max-w-2xl mx-auto">
            <div class="relative flex items-center">
              <input
                id="hero-search-input"
                type="text"
                placeholder="Smartfon nomi yoki protsessorini yozing (masalan: iPhone 15 Pro, S24 Ultra, A55)..."
                value="${this.state.filters.q}"
                oninput="App.onSearchInput(event)"
                class="w-full pl-12 pr-10 py-4 rounded-2xl glass-panel text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500/50 shadow-2xl transition-all"
              />
              <i data-lucide="search" class="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none"></i>
              ${this.state.filters.q ? `
                <button onclick="App.clearSearch()" class="absolute right-4 text-slate-400 hover:text-white">
                  <i data-lucide="x" class="w-4 h-4"></i>
                </button>
              ` : ''}
            </div>

            <!-- Quick Search Tags -->
            <div class="flex flex-wrap items-center justify-center gap-2 mt-3 text-xs">
              <span class="text-slate-400">Tezkor:</span>
              <button onclick="App.quickSearch('iPhone 16 Pro Max')" class="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors">iPhone 16 Pro Max</button>
              <button onclick="App.quickSearch('S24 Ultra')" class="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors">S24 Ultra</button>
              <button onclick="App.quickSearch('Galaxy A55')" class="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors">Galaxy A55</button>
              <button onclick="App.quickSearch('Z Fold 6')" class="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors">Z Fold 6</button>
            </div>
          </div>

          <!-- Quick Stats Bar -->
          ${this.state.stats ? `
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 max-w-3xl mx-auto">
              <div class="p-3 rounded-xl glass-panel border border-white/5">
                <span class="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">Katalogdagi telefonlar</span>
                <span class="text-xl font-black text-cyan-400">${this.state.stats.total_phones} ta model</span>
              </div>
              <div class="p-3 rounded-xl glass-panel border border-white/5">
                <span class="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">Eng yuqori AnTuTu</span>
                <span class="text-xl font-black text-purple-400">${this.state.stats.max_antutu.toLocaleString()} ball</span>
              </div>
              <div class="p-3 rounded-xl glass-panel border border-white/5">
                <span class="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">Apple iPhone</span>
                <span class="text-xl font-black text-slate-200">${this.state.stats.apple_count} ta avlod</span>
              </div>
              <div class="p-3 rounded-xl glass-panel border border-white/5">
                <span class="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">Samsung Galaxy</span>
                <span class="text-xl font-black text-slate-200">${this.state.stats.samsung_count} ta model</span>
              </div>
            </div>
          ` : ''}
        </div>
      </section>

      <!-- 4. SMARTPHONE CLASSIFICATION TABS (Flagman, O'rta, Budjet) -->
      <section class="mb-8">
        <div class="flex items-center justify-between pb-3 border-b border-white/10 mb-6 flex-wrap gap-4">
          <div>
            <h2 class="text-xl font-extrabold text-white flex items-center gap-2">
              <i data-lucide="layers" class="w-5 h-5 text-cyan-400"></i> Smartfonlar Toifalari
            </h2>
            <p class="text-xs text-slate-400">Unumdorlik va narx segmenti bo'yicha saralash</p>
          </div>

          <!-- Category filter buttons -->
          <div class="flex items-center gap-1.5 p-1 rounded-xl glass-panel border border-white/10 text-xs">
            <button onclick="App.filterByCategory('all')" class="px-3 py-1.5 rounded-lg font-semibold transition-all ${
              this.state.filters.category === 'all' ? 'bg-cyan-500 text-black shadow-md' : 'text-slate-400 hover:text-white'
            }">Barchasi</button>
            <button onclick="App.filterByCategory('flagman')" class="px-3 py-1.5 rounded-lg font-semibold transition-all ${
              this.state.filters.category === 'flagman' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }">Eng kuchli flagmanlar</button>
            <button onclick="App.filterByCategory('orta')" class="px-3 py-1.5 rounded-lg font-semibold transition-all ${
              this.state.filters.category === 'orta' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }">O'rta segment</button>
            <button onclick="App.filterByCategory('budjet')" class="px-3 py-1.5 rounded-lg font-semibold transition-all ${
              this.state.filters.category === 'budjet' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }">Boshlang'ich budjet</button>
          </div>
        </div>

        <!-- Comprehensive Filter & Sorting Toolbar -->
        <div class="p-4 rounded-2xl glass-panel border border-white/10 mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <!-- Brand filter -->
          <div>
            <label class="block text-slate-400 font-semibold mb-1">Brend:</label>
            <select onchange="App.filterByBrand(this.value)" class="w-full py-2 px-3 rounded-lg bg-slate-900 border border-white/10 text-slate-200 focus:outline-none focus:border-cyan-500">
              <option value="all" ${brand === 'all' ? 'selected' : ''}>Barcha brendlar</option>
              <option value="Apple" ${brand === 'Apple' ? 'selected' : ''}>Apple iPhone</option>
              <option value="Samsung" ${brand === 'Samsung' ? 'selected' : ''}>Samsung Galaxy</option>
            </select>
          </div>

          <!-- Series filter -->
          <div>
            <label class="block text-slate-400 font-semibold mb-1">Seriya:</label>
            <select onchange="App.setSeriesFilter(this.value)" class="w-full py-2 px-3 rounded-lg bg-slate-900 border border-white/10 text-slate-200 focus:outline-none focus:border-cyan-500">
              <option value="all" ${series === 'all' ? 'selected' : ''}>Barcha seriyalar</option>
              <option value="iPhone" ${series === 'iPhone' ? 'selected' : ''}>Apple iPhone</option>
              <option value="Galaxy S" ${series === 'Galaxy S' ? 'selected' : ''}>Samsung Galaxy S (Flagman)</option>
              <option value="Galaxy Z" ${series === 'Galaxy Z' ? 'selected' : ''}>Samsung Galaxy Z (Fold/Flip)</option>
              <option value="Galaxy A" ${series === 'Galaxy A' ? 'selected' : ''}>Samsung Galaxy A (Budjet/O'rta)</option>
            </select>
          </div>

          <!-- Sorting -->
          <div>
            <label class="block text-slate-400 font-semibold mb-1">Saralash tartibi:</label>
            <select onchange="App.setSort(this.value)" class="w-full py-2 px-3 rounded-lg bg-slate-900 border border-white/10 text-slate-200 focus:outline-none focus:border-cyan-500">
              <option value="antutu_desc" ${this.state.filters.sort === 'antutu_desc' ? 'selected' : ''}>Eng kuchli AnTuTu</option>
              <option value="price_asc" ${this.state.filters.sort === 'price_asc' ? 'selected' : ''}>Eng arzon narx</option>
              <option value="price_desc" ${this.state.filters.sort === 'price_desc' ? 'selected' : ''}>Eng qimmat narx</option>
              <option value="year_desc" ${this.state.filters.sort === 'year_desc' ? 'selected' : ''}>Eng yangi chiqqan</option>
              <option value="value_desc" ${this.state.filters.sort === 'value_desc' ? 'selected' : ''}>Eng yaxshi narx / unumdorlik</option>
            </select>
          </div>

          <!-- Result Counter & Reset -->
          <div class="flex items-end justify-between">
            <div>
              <span class="text-slate-400 block">Topilgan natijalar:</span>
              <strong class="text-sm font-bold text-cyan-400">${this.state.smartphones.length} ta smartfon</strong>
            </div>
            <button onclick="App.resetFilters()" class="py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs transition-colors">
              Filtrlarni tozalash
            </button>
          </div>
        </div>
      </section>

      <!-- SMARTPHONE CARDS GRID -->
      <section>
        ${this.state.smartphones.length === 0 ? `
          <div class="py-16 text-center glass-panel rounded-3xl p-8 max-w-xl mx-auto">
            <i data-lucide="search-x" class="w-12 h-12 text-slate-500 mx-auto mb-3"></i>
            <h3 class="text-base font-bold text-white">So'rovingiz bo'yicha telefon topilmadi</h3>
            <p class="text-xs text-slate-400 mt-1">Qidiruv so'zini o'zgartiring yoki filtrlarni qayta sozlang.</p>
            <button onclick="App.resetFilters()" class="mt-4 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold rounded-xl transition-colors">
              Barcha modellarni ko'rish
            </button>
          </div>
        ` : `
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            ${this.state.smartphones.map(phone => this.renderPhoneCard(phone)).join('')}
          </div>
        `}
      </section>
    `;
  },

  // CARD TEMPLATE
  renderPhoneCard(p) {
    const isCompared = this.state.comparisonIds.includes(p.id);
    const antutuFmt = p.antutu.total ? p.antutu.total.toLocaleString() : "N/A";
    const newPriceFmt = p.market.price_new_uzs > 0 ? `${p.market.price_new_uzs.toLocaleString()} so'm` : "Eski model (ishlatilgan)";
    const usedPriceFmt = p.market.price_used_avg_uzs > 0 ? `${p.market.price_used_avg_uzs.toLocaleString()} so'm` : "N/A";

    let catBadgeClass = 'badge-budjet';
    let catText = "Budjet";
    if (p.category === 'flagman') {
      catBadgeClass = 'badge-flagman';
      catText = "Flagman";
    } else if (p.category === 'orta') {
      catBadgeClass = 'badge-orta';
      catText = "O'rta sinf";
    }

    return `
      <div onclick="App.openDetail('${p.id}')" class="glass-card rounded-2xl p-4 flex flex-col justify-between cursor-pointer group relative overflow-hidden">
        
        <!-- Top row: Badge and compare action -->
        <div class="flex items-center justify-between mb-3 z-10">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${catBadgeClass}">
            ${catText}
          </span>
          <button onclick="App.toggleComparison('${p.id}', event)" title="Taqqoslashga qo'shish" class="p-1.5 rounded-lg border ${
            isCompared ? 'bg-cyan-500 text-black border-cyan-400' : 'bg-white/5 border-white/10 text-slate-400 hover:text-cyan-400 hover:bg-white/10'
          } transition-all">
            <i data-lucide="${isCompared ? 'check' : 'scale'}" class="w-3.5 h-3.5"></i>
          </button>
        </div>

        <!-- Phone Image with hover scaling -->
        <div class="w-full aspect-[4/4] flex items-center justify-center p-4 relative">
          <img src="${p.image_url}" alt="${p.name}" loading="lazy" class="max-h-full max-w-full object-contain filter drop-shadow-[0_10px_15px_rgba(0,0,0,0.6)] transform group-hover:scale-110 transition-transform duration-300">
        </div>

        <!-- Phone Name & Specs summary -->
        <div class="mt-2 space-y-1.5">
          <div class="text-[11px] text-slate-400 font-medium">${p.brand} • ${p.series} (${p.release_year})</div>
          <h3 class="text-base font-bold text-white group-hover:text-cyan-400 transition-colors line-clamp-1">${p.name}</h3>
          
          <div class="flex items-center gap-1.5 text-xs text-slate-300 line-clamp-1">
            <i data-lucide="cpu" class="w-3.5 h-3.5 text-cyan-400 shrink-0"></i>
            <span class="truncate">${p.chipset}</span>
          </div>

          <!-- AnTuTu Score Badge -->
          <div class="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-between mt-2">
            <span class="text-[10px] text-orange-400 font-bold uppercase flex items-center gap-1">
              <i data-lucide="flame" class="w-3 h-3"></i> AnTuTu:
            </span>
            <span class="text-xs font-mono font-black text-white">${antutuFmt} <span class="text-[10px] font-normal text-slate-400">ball</span></span>
          </div>

          <!-- Prices Section -->
          <div class="pt-2 border-t border-white/5 space-y-1 text-xs">
            <div class="flex items-center justify-between">
              <span class="text-[10px] text-slate-400">Yangi narxi:</span>
              <strong class="text-emerald-400 font-bold text-right">${newPriceFmt}</strong>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-[10px] text-slate-400">Ishlatilgan (o'rtacha):</span>
              <strong class="text-cyan-300 font-medium text-right">${usedPriceFmt}</strong>
            </div>
          </div>
        </div>

        <!-- Footer button -->
        <div class="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400 group-hover:text-white transition-colors">
          <span class="text-[11px]">Batafsil ma'lumot</span>
          <i data-lucide="arrow-right" class="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform"></i>
        </div>
      </div>
    `;
  },

  // COMPARISON VIEW
  async renderCompareView() {
    const container = document.getElementById('app-container');
    if (!container) return;

    if (this.state.comparisonIds.length === 0) {
      container.innerHTML = `
        <div class="py-20 text-center glass-panel rounded-3xl p-8 max-w-xl mx-auto">
          <div class="w-14 h-14 rounded-2xl bg-cyan-500/10 text-cyan-400 mx-auto flex items-center justify-center mb-4">
            <i data-lucide="scale" class="w-7 h-7"></i>
          </div>
          <h2 class="text-xl font-extrabold text-white">Taqqoslash uchun smartfon tanlanmagan</h2>
          <p class="text-xs text-slate-400 mt-2 max-w-md mx-auto">
            Katalogdagi istalgan 2 yoki 3 ta smartfon kartochkasidagi tarozining belgisi (taqqoslash tugmasi)ni bosing va ularni parametrlar bo'yicha solishtiring.
          </p>
          <button onclick="App.navigate('home')" class="mt-6 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-black text-xs font-bold shadow-lg shadow-cyan-500/20 hover:scale-105 transition-all">
            Katalogga o'tish
          </button>
        </div>
      `;
      this.initLucide();
      return;
    }

    container.innerHTML = `
      <div class="py-12 text-center">
        <div class="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-400"></div>
        <p class="mt-3 text-xs text-slate-400">Taqqoslash parametrlari hisoblanmoqda...</p>
      </div>
    `;

    try {
      const data = await API.getComparison(this.state.comparisonIds);
      const items = data.items || [];
      const winners = data.winners || {};

      container.innerHTML = `
        <!-- Comparison Header -->
        <div class="flex items-center justify-between pb-6 border-b border-white/10 mb-8 flex-wrap gap-4">
          <div>
            <h1 class="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
              <i data-lucide="scale" class="w-7 h-7 text-cyan-400"></i> Telefonlarni Taqqoslash
            </h1>
            <p class="text-xs text-slate-400 mt-1">Smartfonlarning texnik xususiyatlari, AnTuTu ballari va narxlari o'zaro solishtirilishi</p>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="App.clearComparison()" class="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-300 text-xs hover:bg-rose-500/20 transition-colors flex items-center gap-1.5">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Ro'yxatni tozalash
            </button>
            <button onclick="App.navigate('home')" class="px-3 py-1.5 rounded-lg bg-white/5 text-slate-300 text-xs hover:bg-white/10 transition-colors">
              Yana telefon qo'shish
            </button>
          </div>
        </div>

        <!-- Comparison Table / Layout -->
        <div class="overflow-x-auto pb-6">
          <div class="grid grid-cols-${items.length + 1} min-w-[700px] gap-4">
            
            <!-- Column 1: Labels -->
            <div class="space-y-4 pt-48 font-semibold text-xs text-slate-400">
              <div class="p-3 bg-white/5 rounded-xl">Protsessor (Chipset)</div>
              <div class="p-3 bg-white/5 rounded-xl">AnTuTu Natijasi</div>
              <div class="p-3 bg-white/5 rounded-xl">GPU (Grafika kuchi)</div>
              <div class="p-3 bg-white/5 rounded-xl">Displey & Silliqlik</div>
              <div class="p-3 bg-white/5 rounded-xl">Asosiy Kamera</div>
              <div class="p-3 bg-white/5 rounded-xl">Akkumulyator & Zaryad</div>
              <div class="p-3 bg-white/5 rounded-xl">Xotira (RAM / Doimiy)</div>
              <div class="p-3 bg-white/5 rounded-xl">Yangi Narx (O'zbekiston)</div>
              <div class="p-3 bg-white/5 rounded-xl">Ishlatilgan (A'lo holat)</div>
            </div>

            <!-- Phone Columns -->
            ${items.map(p => {
              const isAntutuWinner = winners.antutu === p.id;
              const isGpuWinner = winners.gaming === p.id;
              const isBatteryWinner = winners.battery === p.id;
              const isPriceWinner = winners.best_value === p.id;

              return `
                <div class="glass-panel p-4 rounded-2xl border border-white/10 flex flex-col space-y-4 relative">
                  
                  <!-- Remove button -->
                  <button onclick="App.toggleComparison('${p.id}')" class="absolute top-3 right-3 p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors">
                    <i data-lucide="x" class="w-4 h-4"></i>
                  </button>

                  <!-- Phone Image & Title -->
                  <div class="h-44 flex flex-col items-center justify-center text-center">
                    <img src="${p.image_url}" alt="${p.name}" class="h-28 object-contain drop-shadow-xl mb-2">
                    <h3 class="text-sm font-bold text-white line-clamp-1">${p.name}</h3>
                    <span class="text-[10px] text-slate-400">${p.brand} • ${p.series}</span>
                  </div>

                  <!-- Protsessor -->
                  <div class="p-3 rounded-xl bg-slate-900/90 text-xs text-center border border-white/5">
                    <span class="font-bold text-cyan-300">${p.chipset}</span>
                  </div>

                  <!-- AnTuTu Total -->
                  <div class="p-3 rounded-xl bg-slate-900/90 text-xs text-center border ${isAntutuWinner ? 'border-orange-500/50 bg-orange-500/10' : 'border-white/5'}">
                    <span class="font-mono font-black text-sm text-white">${p.antutu.total ? p.antutu.total.toLocaleString() : 'N/A'}</span>
                    ${isAntutuWinner ? '<span class="block text-[9px] text-orange-400 font-bold uppercase mt-0.5">🏆 Eng yuqori ball</span>' : ''}
                  </div>

                  <!-- GPU -->
                  <div class="p-3 rounded-xl bg-slate-900/90 text-xs text-center border ${isGpuWinner ? 'border-purple-500/50 bg-purple-500/10' : 'border-white/5'}">
                    <span class="font-bold text-purple-300">${p.gpu}</span>
                    ${isGpuWinner ? '<span class="block text-[9px] text-purple-400 font-bold uppercase mt-0.5">🎮 Eng yaxshi geyming</span>' : ''}
                  </div>

                  <!-- Display -->
                  <div class="p-3 rounded-xl bg-slate-900/90 text-xs text-center border border-white/5">
                    <span class="text-slate-200">${p.display}</span>
                  </div>

                  <!-- Camera -->
                  <div class="p-3 rounded-xl bg-slate-900/90 text-xs text-center border border-white/5">
                    <span class="text-slate-200 line-clamp-2">${p.camera}</span>
                  </div>

                  <!-- Battery -->
                  <div class="p-3 rounded-xl bg-slate-900/90 text-xs text-center border ${isBatteryWinner ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-white/5'}">
                    <span class="text-slate-200 font-bold">${p.battery}</span>
                    ${isBatteryWinner ? '<span class="block text-[9px] text-emerald-400 font-bold uppercase mt-0.5">🔋 Eng katta sig\'im</span>' : ''}
                  </div>

                  <!-- RAM / ROM -->
                  <div class="p-3 rounded-xl bg-slate-900/90 text-xs text-center border border-white/5">
                    <span class="text-slate-200">${p.ram} / ${p.storage}</span>
                  </div>

                  <!-- New Price -->
                  <div class="p-3 rounded-xl bg-slate-900/90 text-xs text-center border border-white/5">
                    <span class="font-bold text-emerald-400">${p.price_new_uzs > 0 ? p.price_new_formatted : "To'xtatilgan"}</span>
                  </div>

                  <!-- Used Price -->
                  <div class="p-3 rounded-xl bg-slate-900/90 text-xs text-center border ${isPriceWinner ? 'border-cyan-500/50 bg-cyan-500/10' : 'border-white/5'}">
                    <span class="font-bold text-cyan-300">${p.price_used_excellent_uzs > 0 ? p.price_used_excellent_uzs.toLocaleString() + " so'm" : "N/A"}</span>
                    ${isPriceWinner ? '<span class="block text-[9px] text-cyan-400 font-bold uppercase mt-0.5">💎 Hamyonbop</span>' : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- FINAL COMPARISON VERDICT & RECOMMENDATIONS -->
        <div class="mt-8 p-6 rounded-3xl glass-panel border border-cyan-500/30 bg-gradient-to-br from-cyan-950/20 via-slate-900/80 to-purple-950/20">
          <div class="flex items-center gap-3 mb-4">
            <div class="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <i data-lucide="award" class="w-6 h-6"></i>
            </div>
            <div>
              <h2 class="text-lg font-bold text-white">Xulosa va Ekspert Tavsiyalari</h2>
              <p class="text-xs text-slate-400">Qaysi smartfon qaysi vazifalar uchun eng ma'qul tanlov?</p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div class="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
              <div class="flex items-center gap-2 text-purple-400 font-bold uppercase tracking-wider">
                <i data-lucide="gamepad-2" class="w-4 h-4"></i> O'yinlar va Og'ir Grafika
              </div>
              <p class="text-slate-300 leading-relaxed">
                ${data.conclusion ? data.conclusion.gaming : 'Yuqori FPS va silliq geyming uchun eng yangi protsessorli model tavsiya etiladi.'}
              </p>
            </div>

            <div class="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
              <div class="flex items-center gap-2 text-blue-400 font-bold uppercase tracking-wider">
                <i data-lucide="camera" class="w-4 h-4"></i> Fotosurat va Video Blog
              </div>
              <p class="text-slate-300 leading-relaxed">
                Optik stabilizatsiya (OIS) va katta sensorli kamera yorug'lik past sharoitlarda va portretlarda tabiiy sifat beradi.
              </p>
            </div>

            <div class="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
              <div class="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-wider">
                <i data-lucide="coins" class="w-4 h-4"></i> Narx va Sifat Mutanosibligi
              </div>
              <p class="text-slate-300 leading-relaxed">
                O'zbekiston bozorida har bir sarflangan so'mga eng yuqori unumdorlik va uzoq muddatli dasturiy yangilanishni taqdim etadi.
              </p>
            </div>
          </div>
        </div>
      `;
    } catch (e) {
      container.innerHTML = `
        <div class="py-16 text-center text-rose-400">
          <i data-lucide="alert-triangle" class="w-10 h-10 mx-auto mb-2"></i>
          <p class="text-sm">${e.message}</p>
        </div>
      `;
    }
    this.initLucide();
  },

  // ANTUTU EDUCATIONAL PAGE
  async renderAntutuView() {
    const container = document.getElementById('app-container');
    if (!container) return;

    container.innerHTML = `
      <div class="py-12 text-center">
        <div class="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-orange-400"></div>
        <p class="mt-3 text-xs text-slate-400">AnTuTu ma'lumotlari yuklanmoqda...</p>
      </div>
    `;

    try {
      const data = await API.getAntutuOverview();

      container.innerHTML = `
        <div class="max-w-5xl mx-auto space-y-10">
          
          <!-- Title & Intro -->
          <div class="text-center space-y-3">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold">
              <i data-lucide="flame" class="w-3.5 h-3.5"></i> Ta'limiy Qo'llanma
            </div>
            <h1 class="text-3xl sm:text-5xl font-black text-white">${data.title}</h1>
            <p class="text-sm text-slate-300 max-w-3xl mx-auto leading-relaxed">
              ${data.definition}
            </p>
          </div>

          <!-- Components Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${data.components.map(c => `
              <div class="glass-panel p-5 rounded-2xl border border-white/10 space-y-2">
                <div class="flex items-center justify-between">
                  <h3 class="text-sm font-bold text-white">${c.name}</h3>
                  <span class="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-xs font-mono font-semibold">${c.weight}</span>
                </div>
                <p class="text-xs text-slate-300 leading-relaxed">${c.description}</p>
              </div>
            `).join('')}
          </div>

          <!-- Score Tiers -->
          <div class="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
            <h2 class="text-base font-bold text-white flex items-center gap-2">
              <i data-lucide="target" class="w-5 h-5 text-purple-400"></i> Ballar Nimani Anglatadi? (Klassifikatsiya)
            </h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              ${data.score_tiers.map(t => `
                <div class="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
                  <div class="flex items-center justify-between">
                    <strong class="text-cyan-300">${t.tier}</strong>
                    <span class="font-mono text-slate-400 font-bold">${t.range}</span>
                  </div>
                  <p class="text-slate-300 text-[11px] leading-relaxed">${t.desc}</p>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Important Caveats -->
          <div class="p-6 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2">
            <h3 class="text-sm font-bold text-amber-300 flex items-center gap-2">
              <i data-lucide="alert-circle" class="w-4 h-4"></i> Nima Uchun Faqat AnTuTu Balliga Qarab Telefon Tanlamaslik Kerak?
            </h3>
            <ul class="space-y-1.5 text-slate-300 list-disc list-inside">
              ${data.important_caveats.map(c => `<li>${c}</li>`).join('')}
            </ul>
          </div>

          <!-- Top 10 Benchmark Leaderboard -->
          <div class="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
            <h2 class="text-base font-bold text-white flex items-center gap-2">
              <i data-lucide="trophy" class="w-5 h-5 text-yellow-400"></i> Top-10 Eng Kuchli Smartfonlar Reytingi
            </h2>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs text-slate-300">
                <thead class="border-b border-white/10 text-[11px] text-slate-400 uppercase font-semibold">
                  <tr>
                    <th class="py-3 px-3">O'rin</th>
                    <th class="py-3 px-3">Smartfon</th>
                    <th class="py-3 px-3">Protsessor</th>
                    <th class="py-3 px-3">CPU</th>
                    <th class="py-3 px-3">GPU</th>
                    <th class="py-3 px-3 text-right">Jami AnTuTu</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-white/5">
                  ${data.top_ranking.map((p, idx) => `
                    <tr onclick="App.openDetail('${p.id}')" class="hover:bg-white/5 cursor-pointer transition-colors">
                      <td class="py-3 px-3 font-bold ${idx < 3 ? 'text-yellow-400' : 'text-slate-400'}">#${idx + 1}</td>
                      <td class="py-3 px-3 font-semibold text-white flex items-center gap-2">
                        <img src="${p.image_url}" class="w-6 h-6 object-contain rounded" alt="${p.name}">
                        <span>${p.name}</span>
                      </td>
                      <td class="py-3 px-3 text-cyan-300">${p.chipset}</td>
                      <td class="py-3 px-3 font-mono">${p.cpu_score.toLocaleString()}</td>
                      <td class="py-3 px-3 font-mono text-purple-300">${p.gpu_score.toLocaleString()}</td>
                      <td class="py-3 px-3 text-right font-mono font-black text-white text-sm">${p.total_score.toLocaleString()}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      `;
    } catch (e) {
      container.innerHTML = `<div class="p-8 text-center text-rose-400">${e.message}</div>`;
    }
    this.initLucide();
  },

  // ADMIN VIEW & CONTROLS
  renderAdminView() {
    this.openAdminModal();
  },

  async openAdminModal() {
    const modal = document.getElementById('admin-modal');
    const content = document.getElementById('admin-modal-content');
    if (!modal || !content) return;

    modal.classList.remove('hidden');

    if (!this.state.isAdmin) {
      // Show PIN Login form
      content.innerHTML = `
        <div class="text-center space-y-4">
          <div class="w-14 h-14 rounded-2xl bg-cyan-500/10 text-cyan-400 mx-auto flex items-center justify-center">
            <i data-lucide="lock" class="w-7 h-7"></i>
          </div>
          <h2 class="text-xl font-bold text-white">Admin Paneliga Kirish</h2>
          <p class="text-xs text-slate-400 max-w-sm mx-auto">
            Smartfonlar ma'lumotlari, AnTuTu natijalari va O'zbekiston narxlarini boshqarish uchun 4 xonali PIN kodni kiriting.
          </p>

          <div class="max-w-xs mx-auto space-y-3 pt-2">
            <input
              type="password"
              id="admin-pin-input"
              maxlength="8"
              placeholder="Standart PIN: 7777"
              class="w-full text-center tracking-widest text-lg font-mono py-3 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-cyan-500"
              onkeypress="if(event.key === 'Enter') App.submitAdminLogin()"
            />
            <button onclick="App.submitAdminLogin()" class="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all">
              Tizimga kirish
            </button>
            <p class="text-[10px] text-slate-500">Standart PIN kod: 7777</p>
          </div>
        </div>
      `;
    } else {
      // Show Admin Dashboard Actions
      content.innerHTML = `
        <div>
          <div class="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
            <div class="flex items-center gap-3">
              <div class="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <i data-lucide="shield-check" class="w-6 h-6"></i>
              </div>
              <div>
                <h3 class="text-base font-bold text-white">Admin Boshqaruv Markazi</h3>
                <span class="text-xs text-emerald-400 flex items-center gap-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Faol seans
                </span>
              </div>
            </div>
            <button onclick="App.adminLogout()" class="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-300 text-xs hover:bg-rose-500/20 transition-colors">
              Chiqish
            </button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <button onclick="App.openCreateSmartphoneModal()" class="p-5 rounded-2xl glass-panel border border-cyan-500/30 hover:border-cyan-500/60 text-left transition-all group">
              <div class="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 w-fit mb-3 group-hover:scale-110 transition-transform">
                <i data-lucide="plus-circle" class="w-6 h-6"></i>
              </div>
              <h4 class="text-sm font-bold text-white">Yangi Smartfon Qo'shish</h4>
              <p class="text-[11px] text-slate-400 mt-1">Katalogga yangi model kiritish, xususiyatlar, AnTuTu va narxlarni to'ldirish.</p>
            </button>

            <button onclick="App.closeAdminModal(); App.navigate('home')" class="p-5 rounded-2xl glass-panel border border-white/10 hover:border-white/30 text-left transition-all group">
              <div class="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 w-fit mb-3 group-hover:scale-110 transition-transform">
                <i data-lucide="edit-3" class="w-6 h-6"></i>
              </div>
              <h4 class="text-sm font-bold text-white">Mavjud Modellarni Tahrirlash</h4>
              <p class="text-[11px] text-slate-400 mt-1">Katalogdagi smartfon kartochkalaridan istalgan birini tanlab narx va ballarni yangilang.</p>
            </button>
          </div>

          <!-- Quick list of smartphones with Edit/Delete buttons -->
          <div class="space-y-3">
            <h4 class="text-xs font-bold text-slate-300 uppercase tracking-wider">Barcha Smartfonlar Boshqaruvi (${this.state.smartphones.length} ta)</h4>
            <div class="max-h-60 overflow-y-auto space-y-1.5 pr-1">
              ${this.state.smartphones.map(p => `
                <div class="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-xs">
                  <div class="flex items-center gap-2.5">
                    <img src="${p.image_url}" class="w-7 h-7 object-contain" alt="">
                    <div>
                      <strong class="text-white block line-clamp-1">${p.name}</strong>
                      <span class="text-[10px] text-slate-400">${p.chipset} • AnTuTu: ${p.antutu.total ? p.antutu.total.toLocaleString() : 'N/A'}</span>
                    </div>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <button onclick="App.openEditModal('${p.id}')" class="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20" title="Tahrirlash">
                      <i data-lucide="edit" class="w-3.5 h-3.5"></i>
                    </button>
                    <button onclick="App.deleteSmartphone('${p.id}', '${p.name}')" class="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20" title="O'chirish">
                      <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    }
    this.initLucide();
  },

  async submitAdminLogin() {
    const pin = document.getElementById('admin-pin-input')?.value;
    if (!pin) {
      this.showToast("PIN kodni kiriting!", "warning");
      return;
    }
    try {
      const res = await API.adminLogin(pin);
      if (res.success) {
        this.state.isAdmin = true;
        this.showToast("Admin sifatida kirdingiz!", "success");
        this.openAdminModal();
      }
    } catch (e) {
      this.showToast(e.message, "error");
    }
  },

  adminLogout() {
    API.setAuthToken('');
    this.state.isAdmin = false;
    this.showToast("Tizimdan chiqildi", "info");
    this.closeAdminModal();
  },

  closeAdminModal() {
    const modal = document.getElementById('admin-modal');
    if (modal) modal.classList.add('hidden');
  },

  // CRUD MODAL (CREATE / EDIT)
  openCreateSmartphoneModal() {
    this.closeAdminModal();
    const modal = document.getElementById('admin-crud-modal');
    const content = document.getElementById('admin-crud-content');
    if (!modal || !content) return;

    modal.classList.remove('hidden');
    content.innerHTML = `
      <div class="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
        <h3 class="text-lg font-bold text-white flex items-center gap-2">
          <i data-lucide="plus-circle" class="w-5 h-5 text-cyan-400"></i> Yangi Smartfon Qo'shish
        </h3>
        <button onclick="App.closeCrudModal()" class="p-1.5 rounded-lg text-slate-400 hover:text-white">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
      </div>

      <form onsubmit="App.submitCreateForm(event)" class="space-y-6 text-xs">
        
        <!-- Asosiy ma'lumotlar -->
        <div class="space-y-3">
          <h4 class="font-bold text-cyan-400 uppercase tracking-wider text-[11px]">1. Asosiy ma'lumotlar</h4>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block text-slate-400 mb-1">Nomi:</label>
              <input type="text" id="crud-name" required placeholder="Masalan: Samsung Galaxy S25 Ultra" class="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white">
            </div>
            <div>
              <label class="block text-slate-400 mb-1">Brend:</label>
              <select id="crud-brand" class="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white">
                <option value="Samsung">Samsung</option>
                <option value="Apple">Apple</option>
              </select>
            </div>
            <div>
              <label class="block text-slate-400 mb-1">Seriya:</label>
              <select id="crud-series" class="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white">
                <option value="Galaxy S">Galaxy S</option>
                <option value="Galaxy Z">Galaxy Z</option>
                <option value="Galaxy A">Galaxy A</option>
                <option value="iPhone">iPhone</option>
              </select>
            </div>
            <div>
              <label class="block text-slate-400 mb-1">Toifa / Segment:</label>
              <select id="crud-category" class="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white">
                <option value="flagman">Eng kuchli flagman</option>
                <option value="orta">O'rta segment</option>
                <option value="budjet">Boshlang'ich budjet</option>
              </select>
            </div>
            <div>
              <label class="block text-slate-400 mb-1">Chiqarilgan yili:</label>
              <input type="number" id="crud-year" value="2024" class="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white">
            </div>
            <div>
              <label class="block text-slate-400 mb-1">Rasm URL havolasi:</label>
              <input type="url" id="crud-image" required value="https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s24-ultra-5g-sm-s928-stylus.jpg" class="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white">
            </div>
          </div>
        </div>

        <!-- Protsessor & AnTuTu -->
        <div class="space-y-3 pt-3 border-t border-white/5">
          <h4 class="font-bold text-orange-400 uppercase tracking-wider text-[11px]">2. Protsessor va AnTuTu Natijalari</h4>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block text-slate-400 mb-1">Chipset nomi:</label>
              <input type="text" id="crud-chipset" required placeholder="Snapdragon 8 Gen 3 / Apple A18 Pro" class="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white">
            </div>
            <div>
              <label class="block text-slate-400 mb-1">Jami AnTuTu Bali:</label>
              <input type="number" id="crud-antutu-total" required placeholder="Masalan: 1950000" class="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white">
            </div>
            <div>
              <label class="block text-slate-400 mb-1">AnTuTu Versiyasi:</label>
              <input type="text" id="crud-antutu-version" value="v10.3" class="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white">
            </div>
          </div>
          <div>
            <label class="block text-slate-400 mb-1">Protsessor kuchi tavsifi (o'zbek tilida):</label>
            <textarea id="crud-cpu-desc" rows="2" class="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white" placeholder="Ushbu protsessor og'ir o'yinlar va sun'iy intellekt vazifalarini qanday bajaradi..."></textarea>
          </div>
        </div>

        <!-- Bozor narxlari (O'zbekiston) -->
        <div class="space-y-3 pt-3 border-t border-white/5">
          <h4 class="font-bold text-emerald-400 uppercase tracking-wider text-[11px]">3. O'zbekiston Bozor Narxlari (so'mda)</h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-slate-400 mb-1">Yangi telefon narxi (UZS):</label>
              <input type="number" id="crud-price-new" placeholder="14500000 (0 agar eski bo'lsa)" class="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white">
            </div>
            <div>
              <label class="block text-slate-400 mb-1">Ishlatilgan (A'lo holat):</label>
              <input type="number" id="crud-price-used-exc" placeholder="12500000" class="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white">
            </div>
          </div>
        </div>

        <div class="pt-4 flex justify-end gap-3 border-t border-white/10">
          <button type="button" onclick="App.closeCrudModal()" class="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300">Bekor qilish</button>
          <button type="submit" class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold shadow-lg shadow-cyan-500/20">Saqlash</button>
        </div>
      </form>
    `;
    this.initLucide();
  },

  async submitCreateForm(e) {
    e.preventDefault();
    const phoneData = {
      name: document.getElementById('crud-name')?.value,
      brand: document.getElementById('crud-brand')?.value,
      series: document.getElementById('crud-series')?.value,
      category: document.getElementById('crud-category')?.value,
      release_year: parseInt(document.getElementById('crud-year')?.value || 2024),
      image_url: document.getElementById('crud-image')?.value,
      specs: {
        chipset: document.getElementById('crud-chipset')?.value,
        processor_explanation: document.getElementById('crud-cpu-desc')?.value || "Yuqori quvvatli mobil chip."
      },
      antutu: {
        total_score: parseInt(document.getElementById('crud-antutu-total')?.value || 1000000),
        version: document.getElementById('crud-antutu-version')?.value || "v10.3"
      },
      market: {
        price_new_uzs: parseInt(document.getElementById('crud-price-new')?.value || 0),
        price_used_excellent_uzs: parseInt(document.getElementById('crud-price-used-exc')?.value || 0)
      }
    };

    try {
      const res = await API.createSmartphone(phoneData);
      this.showToast(res.message || "Smartfon muvaffaqiyatli qo'shildi!", "success");
      this.closeCrudModal();
      await this.loadSmartphones();
      await this.loadStats();
    } catch (err) {
      this.showToast("Xatolik: " + err.message, "error");
    }
  },

  async openEditModal(phoneId) {
    this.closeAdminModal();
    const modal = document.getElementById('admin-crud-modal');
    const content = document.getElementById('admin-crud-content');
    if (!modal || !content) return;

    modal.classList.remove('hidden');
    content.innerHTML = `<div class="p-8 text-center text-xs text-slate-400">Yuklanmoqda...</div>`;

    try {
      const p = await API.getSmartphoneDetail(phoneId);

      content.innerHTML = `
        <div class="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
          <h3 class="text-lg font-bold text-white flex items-center gap-2">
            <i data-lucide="edit" class="w-5 h-5 text-blue-400"></i> ${p.name} — Ma'lumotlarini Yangilash
          </h3>
          <button onclick="App.closeCrudModal()" class="p-1.5 rounded-lg text-slate-400 hover:text-white">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <form onsubmit="App.submitEditForm(event, '${p.id}')" class="space-y-5 text-xs">
          
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-slate-400 mb-1">Nomi:</label>
              <input type="text" id="edit-name" value="${p.name}" class="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white">
            </div>
            <div>
              <label class="block text-slate-400 mb-1">Toifa (Segment):</label>
              <select id="edit-category" class="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white">
                <option value="flagman" ${p.category === 'flagman' ? 'selected' : ''}>Eng kuchli flagman</option>
                <option value="orta" ${p.category === 'orta' ? 'selected' : ''}>O'rta segment</option>
                <option value="budjet" ${p.category === 'budjet' ? 'selected' : ''}>Boshlang'ich budjet</option>
              </select>
            </div>
          </div>

          <div class="p-4 rounded-xl glass-panel border border-orange-500/20 space-y-3">
            <h4 class="font-bold text-orange-400 uppercase tracking-wider text-[11px]">AnTuTu Ballari</h4>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label class="block text-slate-400 mb-1">Jami Ball:</label>
                <input type="number" id="edit-antutu-total" value="${p.antutu.total_score}" class="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white">
              </div>
              <div>
                <label class="block text-slate-400 mb-1">CPU Balli:</label>
                <input type="number" id="edit-antutu-cpu" value="${p.antutu.cpu_score}" class="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white">
              </div>
              <div>
                <label class="block text-slate-400 mb-1">GPU Balli:</label>
                <input type="number" id="edit-antutu-gpu" value="${p.antutu.gpu_score}" class="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white">
              </div>
            </div>
          </div>

          <div class="p-4 rounded-xl glass-panel border border-emerald-500/20 space-y-3">
            <h4 class="font-bold text-emerald-400 uppercase tracking-wider text-[11px]">O'zbekiston Bozor Narxlari (so'm)</h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-slate-400 mb-1">Yangi Narx (UZS):</label>
                <input type="number" id="edit-price-new" value="${p.market.price_new_uzs}" class="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white">
              </div>
              <div>
                <label class="block text-slate-400 mb-1">Ishlatilgan (A'lo holat):</label>
                <input type="number" id="edit-price-used-exc" value="${p.market.price_used_excellent_uzs}" class="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white">
              </div>
            </div>
            <div>
              <label class="block text-slate-400 mb-1">Bozor sharhi / izohi:</label>
              <input type="text" id="edit-notes" value="${p.market.market_notes || ''}" class="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white">
            </div>
          </div>

          <div class="pt-4 flex justify-end gap-3 border-t border-white/10">
            <button type="button" onclick="App.closeCrudModal()" class="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300">Bekor qilish</button>
            <button type="submit" class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 text-black font-bold shadow-lg shadow-blue-500/20">Yangilash</button>
          </div>
        </form>
      `;
      this.initLucide();
    } catch (err) {
      content.innerHTML = `<div class="p-8 text-center text-rose-400">${err.message}</div>`;
    }
  },

  async submitEditForm(e, phoneId) {
    e.preventDefault();
    const updatePayload = {
      name: document.getElementById('edit-name')?.value,
      category: document.getElementById('edit-category')?.value,
      antutu: {
        total_score: parseInt(document.getElementById('edit-antutu-total')?.value || 0),
        cpu_score: parseInt(document.getElementById('edit-antutu-cpu')?.value || 0),
        gpu_score: parseInt(document.getElementById('edit-antutu-gpu')?.value || 0),
        tested_date: new Date().toISOString().split('T')[0]
      },
      market: {
        price_new_uzs: parseInt(document.getElementById('edit-price-new')?.value || 0),
        price_used_excellent_uzs: parseInt(document.getElementById('edit-price-used-exc')?.value || 0),
        market_notes: document.getElementById('edit-notes')?.value,
        last_updated: new Date().toISOString().split('T')[0]
      }
    };

    try {
      const res = await API.updateSmartphone(phoneId, updatePayload);
      this.showToast(res.message || "Muvaffaqiyatli yangilandi!", "success");
      this.closeCrudModal();
      await this.loadSmartphones();
    } catch (err) {
      this.showToast("Xatolik: " + err.message, "error");
    }
  },

  async deleteSmartphone(phoneId, phoneName) {
    if (!confirm(`Haqiqatan ham "${phoneName}" smartfonini butunlay o'chirmoqchimisiz?`)) {
      return;
    }
    try {
      const res = await API.deleteSmartphone(phoneId);
      this.showToast(res.message || "O'chirildi", "success");
      this.openAdminModal();
      await this.loadSmartphones();
      await this.loadStats();
    } catch (err) {
      this.showToast("Xatolik: " + err.message, "error");
    }
  },

  closeCrudModal() {
    const modal = document.getElementById('admin-crud-modal');
    if (modal) modal.classList.add('hidden');
  },

  // Helpers
  quickSearch(keyword) {
    this.state.filters.q = keyword;
    const input = document.getElementById('hero-search-input');
    if (input) input.value = keyword;
    this.loadSmartphones();
  },

  clearSearch() {
    this.state.filters.q = '';
    const input = document.getElementById('hero-search-input');
    if (input) input.value = '';
    this.loadSmartphones();
  },

  setSeriesFilter(series) {
    this.state.filters.series = series;
    this.loadSmartphones();
  },

  resetFilters() {
    this.state.filters = {
      brand: 'all',
      series: 'all',
      category: 'all',
      q: '',
      sort: 'antutu_desc',
      min_price: '',
      max_price: '',
      min_antutu: ''
    };
    const input = document.getElementById('hero-search-input');
    if (input) input.value = '';
    this.loadSmartphones();
  }
};

// Auto start application when DOM loads
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

