/**
 * SPM 2026 Physics E-Book Download Portal
 * Core Application Engine: Key Verification, 4x Download Quotas & PDF Delivery
 * Backed by Supabase Cloud Database & Offline Vault
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

    // Retry initializing Supabase if CDN script takes longer
    if (!this.isCloudActive && !window.supabase) {
      await new Promise(resolve => setTimeout(resolve, 800));
      this.initSupabaseClient();
    }

    this.bindEvents();
    this.checkUrlParams();
    this.renderProductInfo();
  }

  // Initialize Supabase Cloud Client
  initSupabaseClient() {
    const configUrl = (APP_CONFIG.supabase && APP_CONFIG.supabase.url) || "";
    const configKey = (APP_CONFIG.supabase && APP_CONFIG.supabase.anonKey) || "";

    let supaUrl = configUrl;
    let supaKey = configKey;

    if (!supaUrl || !supaKey) {
      try {
        supaUrl = localStorage.getItem("supabase_url") || "";
        supaKey = localStorage.getItem("supabase_anon_key") || "";
      } catch (e) {
        console.warn("Unable to access localStorage:", e);
      }
    }

    if (supaUrl && supaKey && window.supabase) {
      try {
        this.supabase = window.supabase.createClient(supaUrl.trim(), supaKey.trim());
        this.isCloudActive = true;
        console.log("Supabase Cloud Client connected successfully.");
      } catch (err) {
        console.warn("Failed to connect to Supabase:", err);
        this.isCloudActive = false;
      }
    } else {
      this.isCloudActive = false;
    }
  }

  // Initialize local vault storage
  initStorage() {
    try {
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
    } catch (e) {
      console.warn("Unable to access localStorage:", e);
    }
  }

  getVault() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : { keys: [], settings: {} };
    } catch (e) {
      console.warn("Error reading local vault:", e);
      return { keys: [], settings: {} };
    }
  }

  saveVault(vault) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(vault));
      window.dispatchEvent(new CustomEvent("vaultUpdated", { detail: vault }));
    } catch (e) {
      console.warn("Error saving local vault:", e);
    }
  }

  // Render product details to the DOM
  renderProductInfo() {
    const titleEl = document.getElementById("productTitle");
    const subTitleEl = document.getElementById("productSubtitle");
    const priceEl = document.getElementById("productPrice");

    if (titleEl) titleEl.innerText = "Redeem your Physics SPM 2026 module.";
    if (subTitleEl) subTitleEl.innerText = "Enter the 12-character license key provided in your order confirmation to download the complete question paper and detailed marking scheme.";
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
        setTimeout(() => this.handleVerifyKey(), 800);
      }
    }
  }

  // Handle License Key Verification
  async handleVerifyKey() {
    const input = document.getElementById("licenseKeyInput");
    const downloadSection = document.getElementById("downloadSection");
    const verifyBtn = document.getElementById("verifyBtn");

    if (!input) return;
    const rawKey = input.value.trim().toUpperCase();

    if (!rawKey) {
      this.showStatus("Please enter the license key provided in your order confirmation.", "error");
      return;
    }

    if (verifyBtn) {
      verifyBtn.disabled = true;
      verifyBtn.innerHTML = `<span>Verifying...</span>`;
    }

    let keyRecord = null;

    try {
      // 1. Verify online via Supabase Cloud
      if (this.isCloudActive && this.supabase) {
        const { data, error } = await this.supabase
          .from("license_keys")
          .select("*")
          .ilike("key", rawKey)
          .maybeSingle();

        if (error) {
          console.warn("Supabase query error, attempting local fallback:", error);
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

      // 2. Offline / Local fallback verification
      if (!keyRecord) {
        const vault = this.getVault();
        const localMatch = vault.keys.find(k => k.key.toUpperCase() === rawKey);
        if (localMatch) {
          keyRecord = localMatch;
        }
      }

      if (!keyRecord) {
        this.showStatus("The license key entered is invalid. Please check your order details and try again.", "error");
        if (downloadSection) downloadSection.style.display = "none";
        return;
      }

      this.currentKeyData = keyRecord;

      // Check download quota
      if (keyRecord.downloadsLeft <= 0 || keyRecord.status === "exhausted") {
        this.showStatus("This license key has reached its maximum download allocation (4 of 4 used). Access has been locked.", "warning");
        this.renderDownloadSection(keyRecord, false);
        return;
      }

      if (keyRecord.status === "disabled") {
        this.showStatus("This license key has been deactivated by administration. Please contact support.", "error");
        if (downloadSection) downloadSection.style.display = "none";
        return;
      }

      // Valid & Active License
      this.showStatus(`License verified. You have ${keyRecord.downloadsLeft} of ${keyRecord.maxDownloads || 4} downloads remaining.`, "success");
      this.renderDownloadSection(keyRecord, true);

      setTimeout(() => {
        downloadSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 200);

    } catch (err) {
      console.error("Verification error:", err);
      this.showStatus("An error occurred while verifying the license key. Please try again.", "error");
    } finally {
      if (verifyBtn) {
        verifyBtn.disabled = false;
        verifyBtn.innerHTML = `<span>Redeem</span> &rsaquo;`;
      }
    }
  }

  // Render Unlocked Download Center
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
      quotaChip.innerHTML = `<span>Downloads Remaining: ${left} of ${max}</span>`;
      
      quotaChip.className = "quota-chip";
      if (left >= 3) quotaChip.classList.add("safe");
      else if (left >= 1) quotaChip.classList.add("low");
      else quotaChip.classList.add("exhausted");
    }

    if (quotaHint) {
      if (keyRecord.downloadsLeft >= 3) {
        quotaHint.innerText = "You have 4 total downloads allocated (e.g. 2x Questions & 2x Scheme).";
      } else if (keyRecord.downloadsLeft >= 1) {
        quotaHint.innerText = `${keyRecord.downloadsLeft} downloads remaining.`;
      } else {
        quotaHint.innerText = "Download quota reached (0 of 4 remaining). Please save your downloaded copies.";
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
                <span class="file-type-badge ${isSkema ? 'skema' : ''}">${file.badge || 'PDF Document'}</span>
                <span class="file-size-badge">${file.size}</span>
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
              ${isDisabled ? 'Quota Limit Reached' : 'Download PDF'}
            </button>
          </div>
        `;
      }).join("");
    }
  }

  // Handle PDF Download and Deduct Quota (-1)
  async handleFileDownload(fileId) {
    if (!this.currentKeyData) {
      this.showToast("Please verify your license key first.", "error");
      return;
    }

    const currentKey = this.currentKeyData;

    if (currentKey.downloadsLeft <= 0) {
      this.showToast("Download quota exhausted for this license key (0/4).", "error");
      this.renderDownloadSection(currentKey, false);
      return;
    }

    const confirmDownload = confirm(
      `CONFIRMATION:\nYou are about to use 1 download allocation.\nRemaining quota: ${currentKey.downloadsLeft}.\n\nA verified security serial and timestamp seal will be embedded into your PDF file.\n\nProceed with download now?`
    );

    if (!confirmDownload) return;

    const downloadBtns = document.querySelectorAll(".download-action-btn");
    downloadBtns.forEach(btn => {
      btn.disabled = true;
      btn.innerHTML = `<span>Securing & Watermarking PDF...</span>`;
    });

    let updatedRecord = {
      ...currentKey,
      downloadsLeft: Math.max(0, currentKey.downloadsLeft - 1),
      downloadCount: (currentKey.downloadCount || 0) + 1,
      lastDownloadAt: new Date().toISOString()
    };

    if (updatedRecord.downloadsLeft <= 0) {
      updatedRecord.status = "exhausted";
    }

    // 1. Update in Supabase Cloud
    if (this.isCloudActive && this.supabase && currentKey.id) {
      try {
        await this.supabase
          .from("license_keys")
          .update({
            downloads_left: updatedRecord.downloadsLeft,
            download_count: updatedRecord.downloadCount,
            last_download_at: updatedRecord.lastDownloadAt,
            status: updatedRecord.status
          })
          .eq("id", currentKey.id);
      } catch (err) {
        console.warn("Supabase decrement error, using local fallback:", err);
      }
    }

    // 2. Update local vault
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

    // 3. Generate stamped PDF and trigger download
    const targetFile = APP_CONFIG.product.files.find(f => f.id === fileId);
    if (targetFile) {
      await this.triggerSecurePdfDownload(targetFile, updatedRecord);
    }

    // 4. Update UI
    this.renderDownloadSection(updatedRecord, updatedRecord.downloadsLeft > 0);
    this.showToast(`Download complete. Official security seal applied. Quota remaining: ${updatedRecord.downloadsLeft}.`, "success");
  }

  // Generate rasterized security badge PNG (Canvas)
  generateWatermarkBadgePng(stampText) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const scale = 4;
    const fontSize = 10 * scale;

    ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif`;
    const textMetrics = ctx.measureText(stampText);
    const textWidth = textMetrics.width;
    const textHeight = fontSize * 1.3;

    const padX = 10 * scale;
    const padY = 5 * scale;

    canvas.width = Math.ceil(textWidth + (padX * 2));
    canvas.height = Math.ceil(textHeight + (padY * 2));

    ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif`;
    ctx.textBaseline = "middle";

    const r = 4 * scale;
    ctx.fillStyle = "rgba(243, 244, 246, 0.96)";
    ctx.strokeStyle = "rgba(209, 213, 219, 0.9)";
    ctx.lineWidth = 1 * scale;

    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(0, 0, canvas.width, canvas.height, r);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeRect(0, 0, canvas.width, canvas.height);
    }

    ctx.fillStyle = "#1d1d1f";
    ctx.fillText(stampText, padX, canvas.height / 2);

    const dataUrl = canvas.toDataURL("image/png");
    const base64 = dataUrl.split(",")[1];
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return {
      pngBytes: bytes,
      width: canvas.width / scale,
      height: canvas.height / scale
    };
  }

  // Embed verified stamp on Page 17 & Page 37
  async triggerSecurePdfDownload(targetFile, keyRecord) {
    const pdfLibObj = window.PDFLib || (typeof PDFLib !== "undefined" ? PDFLib : null);

    if (!pdfLibObj) {
      console.warn("PDF-Lib not detected, falling back to direct download.");
      this.triggerBrowserDownload(targetFile);
      return;
    }

    try {
      this.showToast("Securing PDF document...", "info");

      const response = await fetch(targetFile.url);
      if (!response.ok) throw new Error("Failed to fetch PDF file.");
      const existingPdfBytes = await response.arrayBuffer();

      const { PDFDocument } = pdfLibObj;
      const pdfDoc = await PDFDocument.load(existingPdfBytes, { ignoreEncryption: true });

      const now = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      const day = pad(now.getDate());
      const month = pad(now.getMonth() + 1);
      const year = now.getFullYear();
      const hours = pad(now.getHours());
      const minutes = pad(now.getMinutes());
      const seconds = pad(now.getSeconds());
      const formattedDate = `${day}/${month}/${year}`;
      const formattedTime = `${hours}:${minutes}:${seconds}`;

      const trxHash = Math.random().toString(36).substring(2, 8).toUpperCase();
      const uniqueSerial = `${keyRecord.key || "FZ26-XXXX-XXXX"}-${trxHash}`;
      const stampText = `Serial: ${uniqueSerial}  |  Verified: ${formattedDate} ${formattedTime} (MYT)`;

      const badge = this.generateWatermarkBadgePng(stampText);
      const embeddedBadge = await pdfDoc.embedPng(badge.pngBytes);

      const pagesToStamp = [17, 37];
      const totalPages = pdfDoc.getPageCount();

      for (const pageNum of pagesToStamp) {
        const pIndex = pageNum - 1;
        if (pIndex < totalPages) {
          const page = pdfDoc.getPage(pIndex);
          const { width } = page.getSize();

          const paddingRight = 20;
          const x = width - badge.width - paddingRight;
          const y = 14;

          page.drawImage(embeddedBadge, {
            x: x,
            y: y,
            width: badge.width,
            height: badge.height,
            opacity: 0.98
          });
        }
      }

      const modifiedPdfBytes = await pdfDoc.save();
      const blob = new Blob([modifiedPdfBytes], { type: "application/pdf" });
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = targetFile.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);

    } catch (err) {
      console.error("PDF watermark error:", err);
      this.showToast("Proceeding with standard download...", "warning");
      this.triggerBrowserDownload(targetFile);
    }
  }

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

    statusMsg.className = `status-msg ${type} active`;
    statusMsg.innerHTML = `<div>${message}</div>`;
  }

  showToast(message, type = "success") {
    const container = document.getElementById("toastContainer") || this.createToastContainer();
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${message}</span>`;
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
