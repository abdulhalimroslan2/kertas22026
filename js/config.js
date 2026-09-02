/**
 * Konfigurasi Utama Portal E-Book Fizik Percubaan 2026
 * Sistem Pengesahan Kod Lesen & Had Muat Turun (Shopee)
 */

const APP_CONFIG = {
  appName: "Portal Muat Turun E-Book Fizik SPM 2026",
  sellerName: "Cikgu Halim (Shopee Official)",
  storeUrl: "https://shopee.com.my",
  defaultDownloadLimit: 4, // Had muat turun setiap kod (2x Soalan + 2x Skema)
  adminPin: "@reeZ860", // Kata Laluan Keselamatan Admin Penjual

  // Maklumat Produk E-Book
  product: {
    title: "E-Book PDF Fizik Percubaan Negeri 2026 Topikal Kertas 2",
    subtitle: "Koleksi Soalan Terpilih Mengikut Topik, Jawapan Lengkap & Skema Analisis SPM 2026",
    price: "RM 19.99",
    category: "Fizik SPM KSSM Tingkatan 4 & 5",
    files: [
      {
        id: "soalan_kertas2",
        name: "E-Book Soalan Kertas 2 Topikal Percubaan 2026",
        description: "Format PDF berkualiti tinggi, soalan topikal mengikut bab Tingkatan 4 & 5 (Edisi Kemas Kini Master)",
        filename: "E-Book_Fizik_Percubaan_2026_Kertas2.pdf",
        size: "8.4 MB",
        type: "pdf",
        url: "assets/ebook-fizik-percubaan-2026-kertas2.pdf",
        badge: "Modul Soalan"
      },
      {
        id: "skema_jawapan",
        name: "Skema & Analisis Jawapan Lengkap Kertas 2",
        description: "Panduan pemarkahan terperinci, tip skor A+, dan jalan kerja langkah demi langkah (Edisi Kemas Kini Master)",
        filename: "Skema_Jawapan_Lengkap_Fizik_2026.pdf",
        size: "6.3 MB",
        type: "pdf",
        url: "assets/skema-jawapan-lengkap-fizik-2026.pdf",
        badge: "Skema & Tip A+"
      }
    ]
  },

  // ==========================================================
  // KONFIGURASI SUPABASE CLOUD (PENGESAHAN DALAM TALIAN 100%)
  // ==========================================================
  supabase: {
    url: "https://fhwtxkbnxpdgrqmajujr.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZod3R4a2JueHBkZ3JxbWFqdWpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2NjA3OTYsImV4cCI6MjEwMzIzNjc5Nn0.268UE9YfGwi_VNEfXN4mBhB7nMFvgDL1JHjQL3HLYt8"
  },

  // Senarai Kod Awal / Fallback
  initialKeys: []
};

// Eksport jika dalam persekitaran module
if (typeof module !== "undefined" && module.exports) {
  module.exports = APP_CONFIG;
}
