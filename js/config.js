/**
 * SPM 2026 Physics E-Book Portal - Configuration
 * License Key Verification & Download Quota Management System
 */

const APP_CONFIG = {
  appName: "Physics SPM 2026 E-Book Portal",
  sellerName: "Sir Halim Store (Official)",
  storeUrl: "https://sirhalimstore.vercel.app",
  defaultDownloadLimit: 4, // 4 downloads per key (e.g. 2x Questions + 2x Scheme)
  adminPin: "@reeZ860", // Admin Security PIN

  // E-Book Product Details
  product: {
    title: "Physics SPM State Trial Paper 2 Topical E-Book 2026",
    subtitle: "Curated Topical Questions, Step-by-Step Working & Comprehensive A+ Scheme",
    price: "RM 19.99",
    category: "SPM Physics KSSM Form 4 & Form 5",
    files: [
      {
        id: "soalan_kertas2",
        name: "Paper 2 Topical State Trial Question Module 2026",
        description: "High-resolution PDF format, organized by Form 4 & Form 5 chapters (2 September 2026 ERATA Edition)",
        filename: "E-Book_Physics_SPM_Trial_2026_Paper2.pdf",
        size: "8.8 MB",
        type: "pdf",
        url: "assets/ebook-fizik-percubaan-2026-kertas2.pdf",
        badge: "Question Module"
      },
      {
        id: "skema_jawapan",
        name: "Comprehensive Marking Scheme & Analytical Solutions",
        description: "Detailed marking rubrics, maximum score strategies, and step-by-step solutions (2 September 2026 ERATA Edition)",
        filename: "Marking_Scheme_Physics_SPM_Trial_2026.pdf",
        size: "8.8 MB",
        type: "pdf",
        url: "assets/skema-jawapan-lengkap-fizik-2026.pdf",
        badge: "Answer Scheme"
      }
    ]
  },

  // ==========================================================
  // SUPABASE CLOUD CONFIGURATION (100% SECURE CLOUD DATABASE)
  // ==========================================================
  supabase: {
    url: "https://fhwtxkbnxpdgrqmajujr.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZod3R4a2JueHBkZ3JxbWFqdWpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2NjA3OTYsImV4cCI6MjEwMzIzNjc5Nn0.268UE9YfGwi_VNEfXN4mBhB7nMFvgDL1JHjQL3HLYt8"
  },

  // Initial / Fallback Vault Keys
  initialKeys: []
};

// Export for Node module environments
if (typeof module !== "undefined" && module.exports) {
  module.exports = APP_CONFIG;
}
