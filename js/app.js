/**
 * Portal Muat Turun E-Book Fizik SPM 2026
 * Logik Utama: Penebusan Kod, Semakan Had Muat Turun (2x) & Muat Turun Fail
 * Disokong oleh Supabase Cloud Database & Fallback Local Vault
 */

class EbookPortalApp {
  constructor() {
    this.currentKeyData = null;
    this.storageKey = "fizik_ebook_license_vault_v1";
    this.supabase = null;
    this.isCloudActive = false;
    this.init();
  }

  async init() {
    this.initStorage();
    this.initSupabaseClient();
    this.bindEvents();
    this.checkUrlParams();
    this.renderProductInfo();
  }

  // Inisialisasi Klien Supabase
  initSupabaseClient() {
    const savedUrl = localStorage.getItem("supabase_url") || (APP_CONFIG.supabase && APP_CONFIG.supabase.url);
    const savedKey = localStorage.getItem("supabase_anon_key") || (APP_CONFIG.supabase && APP_CONFIG.supabase.anonKey);

    const badgeEl = document.getElementById("cloudStatusBadge");

    if (savedUrl && savedKey && window.supabase) {
      try {
        this.supabase = window.supabase.createClient(savedUrl.trim(), savedKey.trim());
        this.isCloudActive = true;
        if (badgeEl) {
          badgeEl.innerHTML = "🟢 Cloud: Supabase Aktif";
          badgeEl.className = "meta-tag price-tag";
        }
        console.log("Supabase Cloud Client berjaya disambung.");
      } catch (err) {
        console.warn("Gagal menyambung ke Supabase:", err);
        this.isCloudActive = false;
        if (badgeEl) {
          badgeEl.innerHTML = "🟡 Mod: Setempat (Local)";
          badgeEl.className = "meta-tag";
        }
      }
    } else {
      this.isCloudActive = false;
      if (badgeEl) {
        badgeEl.innerHTML = "🟡 Mod: Setempat (Local)";
        badgeEl.className = "meta-tag";
      }
    }
  }

  // Inisialisasi storan tempatan (dengan data awal jika kosong)
  initStorage() {
    const existing = localStorage.getItem(this.storageKey);
    if (!existing) {
      const initialVault = {
        keys: APP_CONFIG.initialKeys || [],
        settings: {
          downloadLimit: APP_CONFIG.defaultDownloadLimit,
          adminPin: APP_CONFIG.adminPin,
          productFiles: APP_CONFIG.product.files
        }
      };
      localStorage.setItem(this.storageKey, JSON.stringify(initialVault));
    }
  }

  getVault() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : { keys: [], settings: {} };
    } catch (e) {
      console.error("Ralat membaca storan:", e);
      return { keys: [], settings: {} };
    }
  }

  saveVault(vault) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(vault));
      window.dispatchEvent(new CustomEvent("vaultUpdated", { detail: vault }));
    } catch (e) {
      console.error("Ralat menyimpan storan:", e);
    }
  }

  // Papar maklumat produk pada antaramuka
  renderProductInfo() {
    const titleEl = document.getElementById("productTitle");
    const subTitleEl = document.getElementById("productSubtitle");
    const priceEl = document.getElementById("productPrice");

    if (titleEl) titleEl.innerText = APP_CONFIG.product.title;
    if (subTitleEl) subTitleEl.innerText = APP_CONFIG.product.subtitle;
    if (priceEl) priceEl.innerText = APP_CONFIG.product.price;
  }

  bindEvents() {
    const verifyForm = document.getElementById("verifyForm");
    const licenseInput = document.getElementById("licenseKeyInput");

    if (verifyForm) {
      verifyForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleVerifyKey();
      });
    }

    if (licenseInput) {
      licenseInput.addEventListener("input", (e) => {
        let val = e.target.value.toUpperCase().replace(/\s+/g, "");
        e.target.value = val;
      });
    }

    document.addEventListener("click", (e) => {
      const downloadBtn = e.target.closest("[data-download-id]");
      if (downloadBtn) {
        const fileId = downloadBtn.getAttribute("data-download-id");
        this.handleFileDownload(fileId);
      }
    });
  }

  checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const keyParam = urlParams.get("key") || urlParams.get("code") || urlParams.get("lesen");
    if (keyParam) {
      const input = document.getElementById("licenseKeyInput");
      if (input) {
        input.value = keyParam.trim().toUpperCase();
        setTimeout(() => this.handleVerifyKey(), 400);
      }
    }
  }

  // Pengesahan Kod Lesen (Supabase Cloud atau Local Vault)
  async handleVerifyKey() {
    const input = document.getElementById("licenseKeyInput");
    const downloadSection = document.getElementById("downloadSection");
    const verifyBtn = document.getElementById("verifyBtn");

    if (!input) return;
    const rawKey = input.value.trim().toUpperCase();

    if (!rawKey) {
      this.showStatus("Sila masukkan Kod Lesen yang anda terima di Shopee Chat.", "error");
      return;
    }

    if (verifyBtn) {
      verifyBtn.disabled = true;
      verifyBtn.innerHTML = `<span>⏳ Menyemak...</span>`;
    }

    let keyRecord = null;

    try {
      // 1. Semakan Secara Dalam Talian Melalui Supabase Cloud
      if (this.isCloudActive && this.supabase) {
        const { data, error } = await this.supabase
          .from("license_keys")
          .select("*")
          .ilike("key", rawKey)
          .maybeSingle();

        if (error) {
          console.warn("Ralat query Supabase, mencuba fallback tempatan:", error);
        } else if (data) {
          keyRecord = {
            id: data.id,
            key: data.key,
            orderId: data.order_id,
            customerName: data.customer_name,
            downloadsLeft: data.downloads_left,
            maxDownloads: data.max_downloads || 4,
            downloadCount: data.download_count || 0,
            status: data.status,
            createdAt: data.created_at,
            lastDownloadAt: data.last_download_at
          };
        }
      }

      // 2. Fallback Semakan Tempatan (Jika belum online / offline)
      if (!keyRecord) {
        const vault = this.getVault();
        const localMatch = vault.keys.find(k => k.key.toUpperCase() === rawKey);
        if (localMatch) {
          keyRecord = localMatch;
        }
      }

      if (!keyRecord) {
        this.showStatus("Kod Lesen tidak sah atau tidak wujud dalam sistem. Sila semak semula mesej di Shopee Chat anda.", "error");
        if (downloadSection) downloadSection.style.display = "none";
        return;
      }

      this.currentKeyData = keyRecord;

      // Semak baki muat turun
      if (keyRecord.downloadsLeft <= 0 || keyRecord.status === "exhausted") {
        this.showStatus("Kod Lesen ini telah mencapai had maksimum muat turun (4 kali). Akses muat turun telah dikunci.", "warning");
        this.renderDownloadSection(keyRecord, false);
        return;
      }

      if (keyRecord.status === "disabled") {
        this.showStatus("Kod Lesen ini telah dinyahaktifkan oleh pihak pentadbir. Sila hubungi penjual Shopee.", "error");
        if (downloadSection) downloadSection.style.display = "none";
        return;
      }

      // Kod Sah & Aktif
      const cloudNotice = this.isCloudActive ? " [Disahkan oleh Supabase Awan]" : "";
      this.showStatus(`Kod Lesen Sah!${cloudNotice} Anda mempunyai baki ${keyRecord.downloadsLeft} daripada ${keyRecord.maxDownloads || 4} kali muat turun.`, "success");
      this.renderDownloadSection(keyRecord, true);

      setTimeout(() => {
        downloadSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 200);

    } catch (err) {
      console.error("Ralat pengesahan:", err);
      this.showStatus("Berlaku masalah semasa menyemak kod. Sila cuba sebentar lagi.", "error");
    } finally {
      if (verifyBtn) {
        verifyBtn.disabled = false;
        verifyBtn.innerHTML = `<span>Sahkan & Tebus</span> ➔`;
      }
    }
  }

  // Papar bahagian muat turun dengan fail & baki terkini
  renderDownloadSection(keyRecord, canDownload = true) {
    const downloadSection = document.getElementById("downloadSection");
    if (!downloadSection) return;

    downloadSection.style.display = "block";

    const keyDisplay = document.getElementById("activeKeyDisplay");
    const quotaChip = document.getElementById("quotaChip");
    const quotaHint = document.getElementById("quotaHint");

    if (keyDisplay) keyDisplay.innerText = keyRecord.key;

    if (quotaChip) {
      const left = keyRecord.downloadsLeft;
      const max = keyRecord.maxDownloads || 4;
      quotaChip.innerHTML = `<span>⚡ Baki Muat Turun: ${left} / ${max} kali</span>`;
      
      quotaChip.className = "quota-chip";
      if (left >= 3) quotaChip.classList.add("safe");
      else if (left >= 1) quotaChip.classList.add("low");
      else quotaChip.classList.add("exhausted");
    }

    if (quotaHint) {
      if (keyRecord.downloadsLeft >= 3) {
        quotaHint.innerText = "Anda mempunyai 4 kali muat turun (contoh: 2x Versi Soalan & 2x Versi Skema).";
      } else if (keyRecord.downloadsLeft >= 1) {
        quotaHint.innerText = `Baki tinggal ${keyRecord.downloadsLeft} kali muat turun lagi.`;
      } else {
        quotaHint.innerText = "Had muat turun (4 kali) telah habis. Sila simpan salinan fail anda.";
      }
    }

    const gridEl = document.getElementById("downloadFilesGrid");
    if (gridEl) {
      const files = APP_CONFIG.product.files || [];
      gridEl.innerHTML = files.map(file => {
        const isSkema = file.id.includes("skema");
        const isDisabled = !canDownload || keyRecord.downloadsLeft <= 0;

        return `
          <div class="download-card">
            <div>
              <div class="card-top">
                <span class="file-type-badge ${isSkema ? 'skema' : ''}">${file.badge || 'PDF E-Book'}</span>
                <span class="file-size-badge">📦 ${file.size}</span>
              </div>
              <div class="file-meta-content">
                <h4>${file.name}</h4>
                <p>${file.description}</p>
              </div>
            </div>
            <button 
              class="btn ${isSkema ? 'btn-success' : 'btn-primary'} download-action-btn" 
              data-download-id="${file.id}"
              ${isDisabled ? 'disabled' : ''}>
              ${isDisabled ? '❌ Had Muat Turun Habis' : '📥 Muat Turun Fail PDF'}
            </button>
          </div>
        `;
      }).join("");
    }
  }

  // Mengendalikan proses muat turun dan tolak kuota (-1) secara selamat
  async handleFileDownload(fileId) {
    if (!this.currentKeyData) {
      this.showToast("Sila sahkan Kod Lesen terlebih dahulu.", "error");
      return;
    }

    const currentKey = this.currentKeyData;

    if (currentKey.downloadsLeft <= 0) {
      this.showToast("Had muat turun untuk kod ini telah habis (0/2).", "error");
      this.renderDownloadSection(currentKey, false);
      return;
    }

    const confirmDownload = confirm(
      `PENTING:\nAnda akan menggunakan 1 kuota muat turun.\nBaki semasa: ${currentKey.downloadsLeft} kali.\n\nAdakah anda ingin meneruskan muat turun fail ini sekarang?`
    );

    if (!confirmDownload) return;

    let updatedRecord = { ...currentKey };

    // 1. Kemas kini di Supabase Cloud jika aktif
    if (this.isCloudActive && this.supabase) {
      try {
        // Cuba panggil RPC fungsi selamat dahulu
        const { data: rpcData, error: rpcError } = await this.supabase.rpc("decrement_download", {
          p_key: currentKey.key
        });

        if (!rpcError && rpcData && rpcData.success) {
          updatedRecord.downloadsLeft = rpcData.downloads_left;
          updatedRecord.downloadCount = rpcData.download_count;
          updatedRecord.status = rpcData.status;
        } else {
          // Direct update fallback di Supabase
          const newLeft = Math.max(0, currentKey.downloadsLeft - 1);
          const newCount = (currentKey.downloadCount || 0) + 1;
          const newStatus = newLeft <= 0 ? "exhausted" : "active";

          const { error: updErr } = await this.supabase
            .from("license_keys")
            .update({
              downloads_left: newLeft,
              download_count: newCount,
              status: newStatus,
              last_download_at: new Date().toISOString()
            })
            .ilike("key", currentKey.key);

          if (!updErr) {
            updatedRecord.downloadsLeft = newLeft;
            updatedRecord.downloadCount = newCount;
            updatedRecord.status = newStatus;
          }
        }
      } catch (err) {
        console.warn("Ralat Supabase decrement, menggunakan local fallback:", err);
      }
    }

    // 2. Kemas kini di Local Vault Cache
    const vault = this.getVault();
    const keyIndex = vault.keys.findIndex(k => k.key.toUpperCase() === currentKey.key.toUpperCase());
    if (keyIndex !== -1) {
      vault.keys[keyIndex].downloadsLeft = Math.max(0, (vault.keys[keyIndex].downloadsLeft || 1) - 1);
      vault.keys[keyIndex].downloadCount = (vault.keys[keyIndex].downloadCount || 0) + 1;
      vault.keys[keyIndex].lastDownloadAt = new Date().toISOString();
      if (vault.keys[keyIndex].downloadsLeft <= 0) {
        vault.keys[keyIndex].status = "exhausted";
      }
      this.saveVault(vault);
      if (!this.isCloudActive) {
        updatedRecord = vault.keys[keyIndex];
      }
    }

    this.currentKeyData = updatedRecord;

    // Cari fail PDF sasaran & mulakan muat turun
    const targetFile = APP_CONFIG.product.files.find(f => f.id === fileId);
    if (targetFile) {
      this.triggerBrowserDownload(targetFile);
    }

    // Kemas kini paparan UI
    this.renderDownloadSection(updatedRecord, updatedRecord.downloadsLeft > 0);
    this.showToast(`Berjaya! Kuota ditolak. Baki muat turun anda: ${updatedRecord.downloadsLeft} kali.`, "success");
  }

  // Trigger Muat Turun Fail
  triggerBrowserDownload(file) {
    const link = document.createElement("a");
    link.href = file.url;
    link.download = file.filename;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  showStatus(message, type = "info") {
    const statusMsg = document.getElementById("statusMsg");
    if (!statusMsg) return;

    statusMsg.className = `status-msg ${type}`;
    let icon = "ℹ️";
    if (type === "error") icon = "❌";
    if (type === "success") icon = "✅";
    if (type === "warning") icon = "⚠️";

    statusMsg.innerHTML = `<span>${icon}</span> <div>${message}</div>`;
  }

  showToast(message, type = "success") {
    const container = document.getElementById("toastContainer") || this.createToastContainer();
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    
    let icon = "✅";
    if (type === "error") icon = "❌";
    if (type === "warning") icon = "⚠️";

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(50px)";
      toast.style.transition = "all 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  createToastContainer() {
    const container = document.createElement("div");
    container.id = "toastContainer";
    container.className = "toast-container";
    document.body.appendChild(container);
    return container;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.portalApp = new EbookPortalApp();
});
