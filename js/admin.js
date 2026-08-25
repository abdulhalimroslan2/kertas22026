/**
 * Portal Muat Turun E-Book Fizik SPM 2026
 * Panel Pengurusan Penjual (Admin Generator, Supabase Cloud & Key Manager)
 */

class EbookAdminManager {
  constructor() {
    this.isAuthenticated = false;
    this.storageKey = "fizik_ebook_license_vault_v1";
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadSavedSupabaseSettings();
    this.listenToStorageUpdates();
  }

  bindEvents() {
    const openAdminBtn = document.getElementById("openAdminBtn");
    if (openAdminBtn) {
      openAdminBtn.addEventListener("click", () => this.handleOpenAdmin());
    }

    document.querySelectorAll("[data-close-modal]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const modal = e.target.closest(".modal-backdrop");
        if (modal) modal.classList.remove("active");
      });
    });

    const pinForm = document.getElementById("adminPinForm");
    if (pinForm) {
      pinForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.verifyPin();
      });
    }

    document.querySelectorAll(".tab-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const targetTab = e.currentTarget.getAttribute("data-tab");
        this.switchTab(targetTab);
      });
    });

    // Penjana Kunci
    const generateSingleBtn = document.getElementById("generateSingleBtn");
    if (generateSingleBtn) {
      generateSingleBtn.addEventListener("click", () => this.generateSingleKey());
    }

    const generateBulkBtn = document.getElementById("generateBulkBtn");
    if (generateBulkBtn) {
      generateBulkBtn.addEventListener("click", () => this.generateBulkKeys());
    }

    // Salin Mesej
    const copyShopeeMsgBtn = document.getElementById("copyShopeeMsgBtn");
    if (copyShopeeMsgBtn) {
      copyShopeeMsgBtn.addEventListener("click", () => this.copyShopeeMessage());
    }

    const copyOnlyKeyBtn = document.getElementById("copyOnlyKeyBtn");
    if (copyOnlyKeyBtn) {
      copyOnlyKeyBtn.addEventListener("click", () => this.copyOnlyKey());
    }

    // Penapis Carian
    const searchKeyInput = document.getElementById("searchKeyInput");
    const statusFilter = document.getElementById("statusFilter");
    if (searchKeyInput) searchKeyInput.addEventListener("input", () => this.renderKeysTable());
    if (statusFilter) statusFilter.addEventListener("change", () => this.renderKeysTable());

    // Supabase Settings Tab
    const saveSupabaseBtn = document.getElementById("saveSupabaseBtn");
    const testSupabaseBtn = document.getElementById("testSupabaseBtn");
    if (saveSupabaseBtn) saveSupabaseBtn.addEventListener("click", () => this.saveSupabaseSettings());
    if (testSupabaseBtn) testSupabaseBtn.addEventListener("click", () => this.testSupabaseConnection());

    // Eksport & Import
    const exportDataBtn = document.getElementById("exportDataBtn");
    const importDataBtn = document.getElementById("importDataBtn");
    const importFileInput = document.getElementById("importFileInput");

    if (exportDataBtn) exportDataBtn.addEventListener("click", () => this.exportData());
    if (importDataBtn && importFileInput) {
      importDataBtn.addEventListener("click", () => importFileInput.click());
      importFileInput.addEventListener("change", (e) => this.importData(e));
    }
  }

  loadSavedSupabaseSettings() {
    const urlInput = document.getElementById("supabaseUrlInput");
    const keyInput = document.getElementById("supabaseKeyInput");

    const savedUrl = localStorage.getItem("supabase_url") || (APP_CONFIG.supabase && APP_CONFIG.supabase.url) || "";
    const savedKey = localStorage.getItem("supabase_anon_key") || (APP_CONFIG.supabase && APP_CONFIG.supabase.anonKey) || "";

    if (urlInput) urlInput.value = savedUrl;
    if (keyInput) keyInput.value = savedKey;
  }

  // Simpan Tetapan Supabase
  saveSupabaseSettings() {
    const urlInput = document.getElementById("supabaseUrlInput");
    const keyInput = document.getElementById("supabaseKeyInput");

    const url = urlInput ? urlInput.value.trim() : "";
    const key = keyInput ? keyInput.value.trim() : "";

    localStorage.setItem("supabase_url", url);
    localStorage.setItem("supabase_anon_key", key);

    if (window.portalApp) {
      window.portalApp.initSupabaseClient();
    }

    window.portalApp.showToast("Tetapan Supabase berjaya disimpan!", "success");
    this.renderKeysTable();
  }

  // Uji Sambungan Supabase
  async testSupabaseConnection() {
    const urlInput = document.getElementById("supabaseUrlInput");
    const keyInput = document.getElementById("supabaseKeyInput");

    const url = urlInput ? urlInput.value.trim() : "";
    const key = keyInput ? keyInput.value.trim() : "";

    if (!url || !key) {
      window.portalApp.showToast("Sila masukkan Project URL dan Anon Key terlebih dahulu.", "error");
      return;
    }

    try {
      window.portalApp.showToast("Menguji sambungan ke Supabase...", "warning");
      const client = window.supabase.createClient(url, key);
      const { data, error } = await client.from("license_keys").select("count", { count: "exact", head: true });

      if (error) {
        window.portalApp.showToast(`Gagal: ${error.message}`, "error");
      } else {
        window.portalApp.showToast("🟢 Sambungan Supabase Cloud BERJAYA!", "success");
      }
    } catch (err) {
      window.portalApp.showToast(`Ralat: ${err.message}`, "error");
    }
  }

  listenToStorageUpdates() {
    window.addEventListener("vaultUpdated", () => {
      if (this.isAuthenticated) {
        this.renderKeysTable();
      }
    });
  }

  getVault() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : { keys: [], settings: {} };
    } catch (e) {
      return { keys: [], settings: {} };
    }
  }

  saveVault(vault) {
    localStorage.setItem(this.storageKey, JSON.stringify(vault));
    this.renderKeysTable();
    window.dispatchEvent(new CustomEvent("vaultUpdated", { detail: vault }));
  }

  handleOpenAdmin() {
    if (this.isAuthenticated) {
      this.showAdminModal();
    } else {
      const pinModal = document.getElementById("adminPinModal");
      const pinInput = document.getElementById("adminPinInput");
      if (pinModal) pinModal.classList.add("active");
      if (pinInput) {
        pinInput.value = "";
        setTimeout(() => pinInput.focus(), 100);
      }
    }
  }

  verifyPin() {
    const pinInput = document.getElementById("adminPinInput");
    const pinError = document.getElementById("pinError");
    const enteredPin = pinInput ? pinInput.value.trim() : "";

    const correctPin = APP_CONFIG.adminPin || "1234";

    if (enteredPin === correctPin) {
      this.isAuthenticated = true;
      const pinModal = document.getElementById("adminPinModal");
      if (pinModal) pinModal.classList.remove("active");
      if (pinError) pinError.style.display = "none";

      this.showAdminModal();
      window.portalApp.showToast("Log masuk Admin berjaya!", "success");
    } else {
      if (pinError) {
        pinError.innerText = "PIN salah. Sila cuba lagi (Lalai: 1234).";
        pinError.style.display = "block";
      }
    }
  }

  showAdminModal() {
    const adminModal = document.getElementById("adminMainModal");
    if (adminModal) {
      adminModal.classList.add("active");
      this.renderKeysTable();
    }
  }

  switchTab(tabId) {
    document.querySelectorAll(".tab-btn").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-tab") === tabId);
    });

    document.querySelectorAll(".tab-pane").forEach(pane => {
      pane.classList.toggle("active", pane.id === tabId);
    });

    if (tabId === "tab-keys") {
      this.renderKeysTable();
    }
  }

  generateRandomKey(prefix = "FZ26") {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const part1 = Array.from({ length: 4 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join("");
    const part2 = Array.from({ length: 4 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join("");
    return `${prefix}-${part1}-${part2}`;
  }

  // Jana Kunci Tunggal (Disimpan ke Supabase & Local Cache)
  async generateSingleKey() {
    const orderInput = document.getElementById("singleOrderInput");
    const buyerInput = document.getElementById("singleBuyerInput");
    const limitInput = document.getElementById("singleLimitInput");
    const prefixInput = document.getElementById("singlePrefixInput");

    const orderId = orderInput ? orderInput.value.trim() : "";
    const customerName = buyerInput ? buyerInput.value.trim() : "";
    const maxDownloads = parseInt(limitInput ? limitInput.value : 4) || 4;
    const prefix = (prefixInput && prefixInput.value.trim()) ? prefixInput.value.trim().toUpperCase() : "FZ26";

    const newKey = this.generateRandomKey(prefix);

    const keyRecord = {
      key: newKey,
      orderId: orderId || "Manual Shopee",
      customerName: customerName || "Pelanggan Shopee",
      downloadsLeft: maxDownloads,
      maxDownloads: maxDownloads,
      downloadCount: 0,
      createdAt: new Date().toISOString(),
      lastDownloadAt: null,
      status: "active"
    };

    // 1. Simpan ke Supabase jika aktif
    if (window.portalApp.isCloudActive && window.portalApp.supabase) {
      try {
        const { error } = await window.portalApp.supabase
          .from("license_keys")
          .insert([{
            key: newKey,
            order_id: keyRecord.orderId,
            customer_name: keyRecord.customerName,
            downloads_left: maxDownloads,
            max_downloads: maxDownloads,
            download_count: 0,
            status: "active"
          }]);

        if (error) {
          console.warn("Ralat insert Supabase:", error);
        } else {
          console.log("Kunci berjaya disimpan ke Supabase Cloud.");
        }
      } catch (err) {
        console.warn("Ralat Supabase insert:", err);
      }
    }

    // 2. Simpan ke Local Vault
    const vault = this.getVault();
    vault.keys.unshift(keyRecord);
    this.saveVault(vault);

    this.displayGeneratedKey(keyRecord);
    window.portalApp.showToast(`Kunci ${newKey} sedia untuk Shopee Chat!`, "success");

    if (orderInput) orderInput.value = "";
    if (buyerInput) buyerInput.value = "";
  }

  // Jana Kunci Pukal
  async generateBulkKeys() {
    const countInput = document.getElementById("bulkCountInput");
    const limitInput = document.getElementById("bulkLimitInput");
    const prefixInput = document.getElementById("bulkPrefixInput");

    const count = Math.min(Math.max(parseInt(countInput ? countInput.value : 5) || 5, 1), 50);
    const maxDownloads = parseInt(limitInput ? limitInput.value : 4) || 4;
    const prefix = (prefixInput && prefixInput.value.trim()) ? prefixInput.value.trim().toUpperCase() : "FZ26";

    const vault = this.getVault();
    const generatedList = [];
    const supabasePayload = [];

    for (let i = 0; i < count; i++) {
      const newKey = this.generateRandomKey(prefix);
      const keyRecord = {
        key: newKey,
        orderId: `Bulk-${Date.now().toString().slice(-4)}-${i + 1}`,
        customerName: "Stok Shopee",
        downloadsLeft: maxDownloads,
        maxDownloads: maxDownloads,
        downloadCount: 0,
        createdAt: new Date().toISOString(),
        lastDownloadAt: null,
        status: "active"
      };
      generatedList.push(keyRecord);
      supabasePayload.push({
        key: newKey,
        order_id: keyRecord.orderId,
        customer_name: keyRecord.customerName,
        downloads_left: maxDownloads,
        max_downloads: maxDownloads,
        download_count: 0,
        status: "active"
      });
      vault.keys.unshift(keyRecord);
    }

    if (window.portalApp.isCloudActive && window.portalApp.supabase) {
      try {
        await window.portalApp.supabase.from("license_keys").insert(supabasePayload);
      } catch (err) {
        console.warn("Ralat bulk insert Supabase:", err);
      }
    }

    this.saveVault(vault);
    window.portalApp.showToast(`${count} Kod Lesen pukal berjaya disimpan ke sistem!`, "success");

    const resultBox = document.getElementById("bulkResultBox");
    const resultTextarea = document.getElementById("bulkResultTextarea");
    if (resultBox && resultTextarea) {
      resultBox.style.display = "block";
      resultTextarea.value = generatedList.map(k => k.key).join("\n");
    }
  }

  displayGeneratedKey(keyRecord) {
    const box = document.getElementById("singleResultBox");
    const keyDisplay = document.getElementById("newKeyCodeDisplay");
    const textarea = document.getElementById("shopeeTemplateTextarea");

    if (box) box.style.display = "block";
    if (keyDisplay) keyDisplay.innerText = keyRecord.key;

    if (textarea) {
      const baseUrl = window.location.origin + window.location.pathname;
      const redeemUrl = `${baseUrl}?key=${keyRecord.key}`;

      const messageTemplate = 
`Salam sejahtera & Terima kasih atas pembelian di Shopee kami! ⭐⭐⭐⭐⭐

Berikut adalah pautan & Kod Lesen untuk memuat turun E-Book Fizik Percubaan SPM 2026 anda:

🔗 Pautan Portal: ${redeemUrl}
🔑 Kod Lesen Anda: ${keyRecord.key}
📦 Kandungan: 
1. E-Book Soalan Kertas 2 Topikal Percubaan 2026 (PDF)
2. Skema & Panduan Jawapan Lengkap + Tip A+ (PDF)

⚠️ PERINGATAN PENTING:
- Kod lesen ini diberikan ${keyRecord.maxDownloads || 4} KALI MUAT TURUN (cth: 2x Soalan + 2x Skema) bagi kemudahan anda.
- Sila terus simpan fail PDF ke peranti (Google Drive / Files / Storan Peranti) setelah selesai muat turun.

Selamat mengulang kaji dan semoga mendapat keputusan A+ Cemerlang dalam SPM Fizik 2026! 🎯`;

      textarea.value = messageTemplate;
      textarea.setAttribute("data-key", keyRecord.key);
    }
  }

  copyShopeeMessage() {
    const textarea = document.getElementById("shopeeTemplateTextarea");
    if (textarea && textarea.value) {
      navigator.clipboard.writeText(textarea.value).then(() => {
        window.portalApp.showToast("Mesej Shopee telah disalin ke Clipboard! Sedia untuk paste di Shopee Chat.", "success");
      });
    }
  }

  copyOnlyKey() {
    const keyDisplay = document.getElementById("newKeyCodeDisplay");
    if (keyDisplay && keyDisplay.innerText) {
      navigator.clipboard.writeText(keyDisplay.innerText.trim()).then(() => {
        window.portalApp.showToast(`Kod Lesen ${keyDisplay.innerText.trim()} telah disalin!`, "success");
      });
    }
  }

  // Render Jadual Pengurusan Kunci Lesen (Ambil dari Supabase jika ada)
  async renderKeysTable() {
    const tbody = document.getElementById("keysTableBody");
    const searchInput = document.getElementById("searchKeyInput");
    const filterSelect = document.getElementById("statusFilter");
    const totalKeysCountEl = document.getElementById("totalKeysCount");

    if (!tbody) return;

    let keys = [];

    // Cuba dapatkan senarai dari Supabase
    if (window.portalApp.isCloudActive && window.portalApp.supabase) {
      try {
        const { data, error } = await window.portalApp.supabase
          .from("license_keys")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && data) {
          keys = data.map(d => ({
            id: d.id,
            key: d.key,
            orderId: d.order_id,
            customerName: d.customer_name,
            downloadsLeft: d.downloads_left,
            maxDownloads: d.max_downloads || 2,
            downloadCount: d.download_count || 0,
            status: d.status,
            createdAt: d.created_at,
            lastDownloadAt: d.last_download_at
          }));
        }
      } catch (e) {
        console.warn("Gagal load Supabase keys:", e);
      }
    }

    // Fallback ke Local Vault jika senarai kosong atau offline
    if (keys.length === 0) {
      const vault = this.getVault();
      keys = vault.keys || [];
    }

    const filterVal = filterSelect ? filterSelect.value : "all";
    if (filterVal === "active") {
      keys = keys.filter(k => k.downloadsLeft > 0 && k.status === "active");
    } else if (filterVal === "low") {
      keys = keys.filter(k => k.downloadsLeft === 1);
    } else if (filterVal === "exhausted") {
      keys = keys.filter(k => k.downloadsLeft <= 0 || k.status === "exhausted");
    }

    const query = searchInput ? searchInput.value.trim().toUpperCase() : "";
    if (query) {
      keys = keys.filter(k => 
        k.key.toUpperCase().includes(query) || 
        (k.orderId && k.orderId.toUpperCase().includes(query)) ||
        (k.customerName && k.customerName.toUpperCase().includes(query))
      );
    }

    if (totalKeysCountEl) {
      totalKeysCountEl.innerText = `${keys.length} kunci disenaraikan`;
    }

    if (keys.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center; padding: 24px; color: var(--text-dim);">
            Tiada kod lesen ditemui padanan carian anda.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = keys.map(k => {
      let badgeClass = "badge-green";
      let statusText = `Baki ${k.downloadsLeft}/${k.maxDownloads || 2}`;

      if (k.downloadsLeft === 1) {
        badgeClass = "badge-amber";
      } else if (k.downloadsLeft <= 0) {
        badgeClass = "badge-red";
        statusText = "Habis (0/2)";
      }

      const dateStr = k.createdAt ? new Date(k.createdAt).toLocaleDateString("ms-MY", { day: "2-digit", month: "short", year: "numeric" }) : "-";

      return `
        <tr>
          <td class="table-key">${k.key}</td>
          <td>
            <div style="font-weight:600;">${k.orderId || '-'}</div>
            <div style="font-size:0.75rem; color:var(--text-dim);">${k.customerName || '-'}</div>
          </td>
          <td>
            <span class="table-badge ${badgeClass}">${statusText}</span>
          </td>
          <td style="font-size:0.75rem; color:var(--text-muted);">${dateStr}</td>
          <td>
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
              <button class="btn btn-secondary btn-sm" onclick="window.adminManager.topUpKey('${k.key}')" title="Tambah +1 Kuota Download">
                ➕ +1 Kuota
              </button>
              <button class="btn btn-secondary btn-sm" onclick="window.adminManager.copyDirectLink('${k.key}')" title="Salin Pautan Penebusan">
                🔗 Salin Link
              </button>
              <button class="btn btn-secondary btn-sm" style="color:#f87171;" onclick="window.adminManager.deleteKey('${k.key}')" title="Padam Kunci">
                🗑️
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  // Tambah / Reset Kuota Muat Turun
  async topUpKey(keyString) {
    if (window.portalApp.isCloudActive && window.portalApp.supabase) {
      try {
        const { data } = await window.portalApp.supabase
          .from("license_keys")
          .select("downloads_left")
          .ilike("key", keyString)
          .maybeSingle();

        const currentLeft = data ? data.downloads_left : 1;
        await window.portalApp.supabase
          .from("license_keys")
          .update({
            downloads_left: currentLeft + 1,
            status: "active"
          })
          .ilike("key", keyString);
      } catch (err) {
        console.warn("Ralat Supabase topup:", err);
      }
    }

    const vault = this.getVault();
    const index = vault.keys.findIndex(k => k.key === keyString);
    if (index !== -1) {
      vault.keys[index].downloadsLeft += 1;
      vault.keys[index].status = "active";
      this.saveVault(vault);
    }

    window.portalApp.showToast(`Kuota untuk ${keyString} telah ditambah (+1)!`, "success");
    this.renderKeysTable();
  }

  copyDirectLink(keyString) {
    const baseUrl = window.location.origin + window.location.pathname;
    const link = `${baseUrl}?key=${keyString}`;
    navigator.clipboard.writeText(link).then(() => {
      window.portalApp.showToast(`Pautan ${keyString} telah disalin!`, "success");
    });
  }

  async deleteKey(keyString) {
    if (!confirm(`Adakah anda pasti ingin memadamkan Kod Lesen ${keyString}?`)) return;

    if (window.portalApp.isCloudActive && window.portalApp.supabase) {
      try {
        await window.portalApp.supabase
          .from("license_keys")
          .delete()
          .ilike("key", keyString);
      } catch (err) {
        console.warn("Ralat Supabase delete:", err);
      }
    }

    const vault = this.getVault();
    vault.keys = vault.keys.filter(k => k.key !== keyString);
    this.saveVault(vault);
    window.portalApp.showToast(`Kod ${keyString} telah dipadamkan.`, "warning");
    this.renderKeysTable();
  }

  exportData() {
    const vault = this.getVault();
    const blob = new Blob([JSON.stringify(vault, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup-kunci-fizik-ebook-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    window.portalApp.showToast("Fail sandaran JSON berjaya dimuat turun.", "success");
  }

  importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedVault = JSON.parse(e.target.result);
        if (importedVault && Array.isArray(importedVault.keys)) {
          this.saveVault(importedVault);
          window.portalApp.showToast(`Berjaya memuat naik ${importedVault.keys.length} rekod kunci!`, "success");
        } else {
          window.portalApp.showToast("Format fail JSON tidak sah.", "error");
        }
      } catch (err) {
        window.portalApp.showToast("Gagal membaca fail sandaran.", "error");
      }
    };
    reader.readAsText(file);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.adminManager = new EbookAdminManager();
});
