/**
 * SPM 2026 Physics E-Book Portal
 * Developer Administration & License Key Management Engine
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

    // Key Generators
    const generateSingleBtn = document.getElementById("generateSingleBtn");
    if (generateSingleBtn) {
      generateSingleBtn.addEventListener("click", () => this.generateSingleKey());
    }

    const generateBulkBtn = document.getElementById("generateBulkBtn");
    if (generateBulkBtn) {
      generateBulkBtn.addEventListener("click", () => this.generateBulkKeys());
    }

    // Copy Actions
    const copyShopeeMsgBtn = document.getElementById("copyShopeeMsgBtn");
    if (copyShopeeMsgBtn) {
      copyShopeeMsgBtn.addEventListener("click", () => this.copyShopeeMessage());
    }

    const copyOnlyKeyBtn = document.getElementById("copyOnlyKeyBtn");
    if (copyOnlyKeyBtn) {
      copyOnlyKeyBtn.addEventListener("click", () => this.copyOnlyKey());
    }

    // Search & Filter
    const searchKeyInput = document.getElementById("searchKeyInput");
    const statusFilter = document.getElementById("statusFilter");
    if (searchKeyInput) searchKeyInput.addEventListener("input", () => this.renderKeysTable());
    if (statusFilter) statusFilter.addEventListener("change", () => this.renderKeysTable());

    // Supabase Settings
    const saveSupabaseBtn = document.getElementById("saveSupabaseBtn");
    const testSupabaseBtn = document.getElementById("testSupabaseBtn");
    if (saveSupabaseBtn) saveSupabaseBtn.addEventListener("click", () => this.saveSupabaseSettings());
    if (testSupabaseBtn) testSupabaseBtn.addEventListener("click", () => this.testSupabaseConnection());

    // Export & Import
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

  // Save Supabase Settings
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

    window.portalApp.showToast("Supabase configuration saved successfully.", "success");
    this.renderKeysTable();
  }

  // Test Supabase Cloud Connection
  async testSupabaseConnection() {
    const urlInput = document.getElementById("supabaseUrlInput");
    const keyInput = document.getElementById("supabaseKeyInput");

    const url = urlInput ? urlInput.value.trim() : "";
    const key = keyInput ? keyInput.value.trim() : "";

    if (!url || !key) {
      window.portalApp.showToast("Please enter both Project URL and Anon API Key.", "error");
      return;
    }

    try {
      window.portalApp.showToast("Testing Supabase Cloud connection...", "info");
      const client = window.supabase.createClient(url, key);
      const { data, error } = await client.from("license_keys").select("count", { count: "exact", head: true });

      if (error) {
        window.portalApp.showToast(`Connection failed: ${error.message}`, "error");
      } else {
        window.portalApp.showToast("Supabase Cloud connection SUCCESSFUL.", "success");
      }
    } catch (err) {
      window.portalApp.showToast(`Error: ${err.message}`, "error");
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

    const correctPin = APP_CONFIG.adminPin || "@reeZ860";

    if (enteredPin === correctPin) {
      this.isAuthenticated = true;
      const pinModal = document.getElementById("adminPinModal");
      if (pinModal) pinModal.classList.remove("active");
      if (pinError) pinError.style.display = "none";

      this.showAdminModal();
      window.portalApp.showToast("Developer authenticated successfully.", "success");
    } else {
      if (pinError) {
        pinError.innerText = "Incorrect password. Please try again.";
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

  // Generate Single License Key
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
      orderId: orderId || "Direct Order",
      customerName: customerName || "Customer",
      downloadsLeft: maxDownloads,
      maxDownloads: maxDownloads,
      downloadCount: 0,
      createdAt: new Date().toISOString(),
      lastDownloadAt: null,
      status: "active"
    };

    // 1. Save to Supabase Cloud
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
          console.warn("Supabase insert error:", error);
        }
      } catch (err) {
        console.warn("Supabase insert exception:", err);
      }
    }

    // 2. Save to local vault
    const vault = this.getVault();
    vault.keys.unshift(keyRecord);
    this.saveVault(vault);

    this.displayGeneratedKey(keyRecord);
    window.portalApp.showToast(`License key ${newKey} created successfully.`, "success");

    if (orderInput) orderInput.value = "";
    if (buyerInput) buyerInput.value = "";
  }

  // Generate Bulk Keys
  async generateBulkKeys() {
    const countInput = document.getElementById("bulkCountInput");
    const limitInput = document.getElementById("bulkLimitInput");
    const prefixInput = document.getElementById("bulkPrefixInput");

    const count = Math.min(Math.max(parseInt(countInput ? countInput.value : 10) || 10, 1), 50);
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
        customerName: "Inventory Batch",
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
        console.warn("Bulk insert error:", err);
      }
    }

    this.saveVault(vault);
    window.portalApp.showToast(`${count} bulk license keys generated and saved.`, "success");

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
`Thank you for your order at Sir Halim Store!

Here is your official access link and License Key to download your Physics SPM 2026 Trial E-Book:

Portal Link: ${redeemUrl}
Your License Key: ${keyRecord.key}
Contents:
1. Paper 2 Topical State Trial Question Module 2026 (PDF)
2. Comprehensive Marking Scheme & Analytical Solutions (PDF)

IMPORTANT INSTRUCTIONS:
- This license key includes ${keyRecord.maxDownloads || 4} DOWNLOAD ALLOCATIONS (e.g. 2x Questions + 2x Scheme) for your convenience.
- Please save your downloaded PDF files directly to your device storage / Google Drive / iCloud Drive.

Wishing you great success in your SPM 2026 Physics examination!`;

      textarea.value = messageTemplate;
      textarea.setAttribute("data-key", keyRecord.key);
    }
  }

  copyShopeeMessage() {
    const textarea = document.getElementById("shopeeTemplateTextarea");
    if (textarea && textarea.value) {
      navigator.clipboard.writeText(textarea.value).then(() => {
        window.portalApp.showToast("Message template copied to clipboard.", "success");
      });
    }
  }

  copyOnlyKey() {
    const keyDisplay = document.getElementById("newKeyCodeDisplay");
    if (keyDisplay && keyDisplay.innerText) {
      navigator.clipboard.writeText(keyDisplay.innerText.trim()).then(() => {
        window.portalApp.showToast(`License key ${keyDisplay.innerText.trim()} copied.`, "success");
      });
    }
  }

  // Render License Keys Table
  async renderKeysTable() {
    const tbody = document.getElementById("keysTableBody");
    const searchInput = document.getElementById("searchKeyInput");
    const filterSelect = document.getElementById("statusFilter");
    const totalKeysCountEl = document.getElementById("totalKeysCount");

    if (!tbody) return;

    let keys = [];

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
            maxDownloads: d.max_downloads || 4,
            downloadCount: d.download_count || 0,
            status: d.status,
            createdAt: d.created_at,
            lastDownloadAt: d.last_download_at
          }));
        }
      } catch (e) {
        console.warn("Failed to load Supabase keys:", e);
      }
    }

    if (keys.length === 0) {
      const vault = this.getVault();
      keys = vault.keys || [];
    }

    const filterVal = filterSelect ? filterSelect.value : "all";
    if (filterVal === "active") {
      keys = keys.filter(k => k.downloadsLeft >= 3 && k.status === "active");
    } else if (filterVal === "low") {
      keys = keys.filter(k => k.downloadsLeft >= 1 && k.downloadsLeft <= 2);
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
      totalKeysCountEl.innerText = `${keys.length} keys`;
    }

    if (keys.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center; padding: 24px; color: var(--text-tertiary);">
            No license keys matching your search criteria.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = keys.map(k => {
      let badgeClass = "badge-green";
      let statusText = `${k.downloadsLeft}/${k.maxDownloads || 4} Left`;

      if (k.downloadsLeft >= 1 && k.downloadsLeft <= 2) {
        badgeClass = "badge-amber";
      } else if (k.downloadsLeft <= 0) {
        badgeClass = "badge-red";
        statusText = "Exhausted (0/4)";
      }

      const dateStr = k.createdAt ? new Date(k.createdAt).toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "numeric" }) : "-";

      return `
        <tr>
          <td class="table-key">${k.key}</td>
          <td>
            <div style="font-weight:600;">${k.orderId || '-'}</div>
            <div style="font-size:12px; color:var(--text-tertiary);">${k.customerName || '-'}</div>
          </td>
          <td>
            <span class="table-badge ${badgeClass}">${statusText}</span>
          </td>
          <td style="font-size:12px; color:var(--text-muted);">${dateStr}</td>
          <td>
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
              <button class="btn btn-secondary btn-sm" onclick="window.adminManager.topUpKey('${k.key}')" title="Add +1 Quota">
                +1 Quota
              </button>
              <button class="btn btn-secondary btn-sm" onclick="window.adminManager.copyDirectLink('${k.key}')" title="Copy Direct Link">
                Copy Link
              </button>
              <button class="btn btn-secondary btn-sm" style="color:#ff3b30;" onclick="window.adminManager.deleteKey('${k.key}')" title="Delete Key">
                Delete
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  // Top Up Quota
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
        console.warn("Supabase topup error:", err);
      }
    }

    const vault = this.getVault();
    const index = vault.keys.findIndex(k => k.key === keyString);
    if (index !== -1) {
      vault.keys[index].downloadsLeft += 1;
      vault.keys[index].status = "active";
      this.saveVault(vault);
    }

    window.portalApp.showToast(`Quota for ${keyString} incremented (+1).`, "success");
    this.renderKeysTable();
  }

  copyDirectLink(keyString) {
    const baseUrl = window.location.origin + window.location.pathname;
    const link = `${baseUrl}?key=${keyString}`;
    navigator.clipboard.writeText(link).then(() => {
      window.portalApp.showToast(`Link for ${keyString} copied.`, "success");
    });
  }

  async deleteKey(keyString) {
    if (!confirm(`Are you sure you want to permanently delete License Key ${keyString}?`)) return;

    if (window.portalApp.isCloudActive && window.portalApp.supabase) {
      try {
        await window.portalApp.supabase
          .from("license_keys")
          .delete()
          .ilike("key", keyString);
      } catch (err) {
        console.warn("Supabase delete error:", err);
      }
    }

    const vault = this.getVault();
    vault.keys = vault.keys.filter(k => k.key !== keyString);
    this.saveVault(vault);
    window.portalApp.showToast(`Key ${keyString} deleted.`, "warning");
    this.renderKeysTable();
  }

  exportData() {
    const vault = this.getVault();
    const blob = new Blob([JSON.stringify(vault, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup-physics-spm-keys-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    window.portalApp.showToast("JSON backup downloaded successfully.", "success");
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
          window.portalApp.showToast(`Successfully imported ${importedVault.keys.length} license records.`, "success");
        } else {
          window.portalApp.showToast("Invalid JSON backup file format.", "error");
        }
      } catch (err) {
        window.portalApp.showToast("Failed to read backup file.", "error");
      }
    };
    reader.readAsText(file);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.adminManager = new EbookAdminManager();
});
