/**
 * LiPDMiSS Frontend API Client for Google Apps Script Backend
 *
 * Liberty Prayer Deliverance Ministries School System
 * Connects index.html / js/script.js to Google Sheets Web App
 *
 * FIXED v3.1.0:
 *  - localStorage now uses a real, constant key ("lipBackendUrl") instead of
 *    using the Apps Script URL itself as the key (which meant the saved URL
 *    could never be found again).
 *  - Added wrapper methods for every backend action that Code.gs supports
 *    (teacher login, grade submission, permissions, subjects, etc.) — the
 *    previous version only covered about half of them.
 */

const LiPDMiSS_API = (function () {
  // =========================================================================
  // CONFIGURATION
  // =========================================================================
  const STORAGE_KEY = 'lipBackendUrl';

  function getUrl() {
    return (localStorage.getItem(STORAGE_KEY) || '').trim();
  }

  function setBackendUrl(url) {
    localStorage.setItem(STORAGE_KEY, (url || '').trim());
  }

  function isBackendConfigured() {
    const url = getUrl();
    return !!url && url.startsWith('http');
  }

  // =========================================================================
  // HTTP POST / GET HELPER (Safe against CORS preflight issues in Apps Script)
  // =========================================================================
  async function request(action, data = {}) {
    const url = getUrl();
    if (!url) {
      throw new Error('Backend URL is not configured. Please set your backend Web App URL in the Cloud tab.');
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

    return await response.json();
  }

  // =========================================================================
  // API METHODS — one per backend action in Code.gs
  // =========================================================================

  async function ping() {
    const url = getUrl();
    if (!url) return { success: false, message: 'No backend URL configured.' };
    const res = await fetch(`${url}?action=ping`, { method: 'GET', redirect: 'follow' });
    return await res.json();
  }

  async function initDatabase() {
    return await request('initDatabase');
  }

  // ---- Auth ----
  async function adminLogin(username, password) {
    return await request('adminLogin', { username, password });
  }
  async function studentLogin(id, password) {
    return await request('studentLogin', { id, password });
  }
  async function teacherLogin(id, password) {
    return await request('teacherLogin', { id, password });
  }

  // ---- Students ----
  async function getAllStudents() {
    return await request('getAllStudents');
  }
  async function getStudentById(id, password = '') {
    return await request('getStudentById', { id, password });
  }
  async function addStudent(student) {
    return await request('addStudent', { student });
  }
  async function updateStudent(student) {
    return await request('updateStudent', { student });
  }
  async function deleteStudent(id) {
    return await request('deleteStudent', { id });
  }

  // ---- Scores ----
  async function saveRecord(id, year, record) {
    return await request('saveRecord', { id, year, record });
  }
  async function deleteRecord(id, year, subject) {
    return await request('deleteRecord', { id, year, subject });
  }
  async function teacherSubmitGrades(teacherId, year, subject, grades) {
    return await request('teacherSubmitGrades', { teacherId, year, subject, grades });
  }

  // ---- Finance ----
  async function saveFinance(id, finance) {
    return await request('saveFinance', { id, finance });
  }
  async function clearFinance(id) {
    return await request('clearFinance', { id });
  }

  // ---- Teachers ----
  async function getTeachers() {
    return await request('getTeachers');
  }
  async function addTeacher(teacher) {
    return await request('addTeacher', { teacher });
  }
  async function deleteTeacher(id) {
    return await request('deleteTeacher', { id });
  }

  // ---- Permissions ----
  async function getPermissions() {
    return await request('getPermissions');
  }
  async function savePermissions(permissions) {
    return await request('savePermissions', { permissions });
  }

  // ---- Subjects ----
  async function getSubjects() {
    return await request('getSubjects');
  }
  async function saveSubjects(subjects) {
    return await request('saveSubjects', { subjects });
  }

  // ---- Bulk sync ----
  async function syncAll(payload) {
    return await request('syncAll', payload);
  }

  return {
    getUrl,
    setBackendUrl,
    isBackendConfigured,
    ping,
    initDatabase,
    adminLogin,
    studentLogin,
    teacherLogin,
    getAllStudents,
    getStudentById,
    addStudent,
    updateStudent,
    deleteStudent,
    saveRecord,
    deleteRecord,
    teacherSubmitGrades,
    saveFinance,
    clearFinance,
    getTeachers,
    addTeacher,
    deleteTeacher,
    getPermissions,
    savePermissions,
    getSubjects,
    saveSubjects,
    syncAll
  };
})();

// Export globally
window.LiPDMiSS_API = LiPDMiSS_API;
