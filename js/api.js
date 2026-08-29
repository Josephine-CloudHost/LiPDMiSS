/**
 * LiPDMiSS Frontend API Client for Google Apps Script Backend
 * 
 * Liberty Prayer Deliverance Ministries School System
 * Connects index.html / js/script.js to Google Sheets Web App
 */

const LiPDMiSS_API = (function () {
  // =========================================================================
  // CONFIGURATION
  // =========================================================================
  // Paste your Google Apps Script Web App URL below after deploying:
  // Example: "https://script.google.com/macros/s/AKfycbx.../exec"
  const BACKEND_URL = localStorage.getItem('lipBackendUrl') || '';

  function getUrl() {
    return localStorage.getItem('lipBackendUrl') || BACKEND_URL;
  }

  function setBackendUrl(url) {
    localStorage.setItem('lipBackendUrl', url.trim());
  }

  function isBackendConfigured() {
    const url = getUrl();
    return url && url.startsWith('http');
  }

  // =========================================================================
  // HTTP POST / GET HELPER (Safe against CORS preflight issues in Apps Script)
  // =========================================================================
  async function request(action, data = {}) {
    const url = getUrl();
    if (!url) {
      throw new Error('Backend URL is not configured. Please set your Google Apps Script Web App URL.');
    }

    const payload = { action, ...data };

    // Google Apps Script requires Content-Type: text/plain to bypass CORS preflight OPTIONS check
    const response = await fetch(url, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Server returned status ${response.status} (${response.statusText})`);
    }

    const result = await response.json();
    return result;
  }

  // =========================================================================
  // API METHODS
  // =========================================================================

  /**
   * Health Check
   */
  async function ping() {
    const url = getUrl();
    if (!url) return { success: false, message: 'No backend URL configured.' };
    const res = await fetch(`${url}?action=ping`, { method: 'GET', redirect: 'follow' });
    return await res.json();
  }

  /**
   * Initialize Spreadsheet Tables
   */
  async function initDatabase() {
    return await request('initDatabase');
  }

  /**
   * Admin Login Verification
   */
  async function adminLogin(username, password) {
    return await request('adminLogin', { username, password });
  }

  /**
   * Student Login Verification
   */
  async function studentLogin(id, password) {
    return await request('studentLogin', { id, password });
  }

  /**
   * Get all student records with finance data
   */
  async function getAllStudents() {
    return await request('getAllStudents');
  }

  /**
   * Get a single student by ID
   */
  async function getStudentById(id, password = '') {
    return await request('getStudentById', { id, password });
  }

  /**
   * Add a new student record
   */
  async function addStudent(student) {
    return await request('addStudent', { student });
  }

  /**
   * Update student details
   */
  async function updateStudent(student) {
    return await request('updateStudent', { student });
  }

  /**
   * Delete a student
   */
  async function deleteStudent(id) {
    return await request('deleteStudent', { id });
  }

  /**
   * Save tuition and registration records
   */
  async function saveFinance(id, finance) {
    return await request('saveFinance', { id, finance });
  }

  /**
   * Reset / clear finance records
   */
  async function clearFinance(id) {
    return await request('clearFinance', { id });
  }

  /**
   * Sync local storage students into Google Sheets
   */
  async function syncAll(studentsList) {
    return await request('syncAll', { students: studentsList });
  }

  return {
    getUrl,
    setBackendUrl,
    isBackendConfigured,
    ping,
    initDatabase,
    adminLogin,
    studentLogin,
    getAllStudents,
    getStudentById,
    addStudent,
    updateStudent,
    deleteStudent,
    saveFinance,
    clearFinance,
    syncAll
  };
})();

// Export globally
window.LiPDMiSS_API = LiPDMiSS_API;
