/**
 * LiPDMiSS Student, Teacher, Score & Finance Portal - Unified Frontend Logic
 * Liberty Prayer Deliverance Ministries School System
 */

// =============================================================================
// GLOBAL CONSTANTS & STATE
// =============================================================================

const grades = [
  "Nursery 1", "Nursery 2", "Kindergarten 1", "Kindergarten 2",
  "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6",
  "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"
];

const schoolYears = [
  "2026-2027", "2027-2028", "2028-2029", "2029-2030", "2030-2031",
  "2031-2032", "2032-2033", "2033-2034", "2034-2035", "2035-2036"
];

const defaultSubjects = [
  "English Language",
  "Mathematics",
  "General Science",
  "Social Studies",
  "Computer Studies",
  "Bible / Religious Education"
];

const defaultTeachers = [
  {
    id: "TCH-101",
    name: "Mr. David Kollie",
    grade: "Grade 1",
    password: "teach123",
    phone: "+231-770-111222"
  },
  {
    id: "TCH-102",
    name: "Mrs. Sarah Weah",
    grade: "Grade 9",
    password: "teach123",
    phone: "+231-770-333444"
  }
];

const defaultPermissions = {
  p1: true,
  p2: false,
  p3: false,
  exam1: false,
  p4: false,
  p5: false,
  p6: false,
  exam2: false
};

const PERIOD_NAMES = {
  p1: "1st Period",
  p2: "2nd Period",
  p3: "3rd Period",
  exam1: "1st Sem Exam",
  p4: "4th Period",
  p5: "5th Period",
  p6: "6th Period",
  exam2: "2nd Sem Exam"
};

let subjects = JSON.parse(localStorage.lipSubjects || JSON.stringify(defaultSubjects));
let students = JSON.parse(localStorage.lipStudents || "[]");
let teachers = JSON.parse(localStorage.lipTeachers || JSON.stringify(defaultTeachers));
let gradingPermissions = JSON.parse(localStorage.lipGradingPerms || JSON.stringify(defaultPermissions));
let activeSchoolYear = localStorage.lipSchoolYear || schoolYears[0];

let currentIndex = null;
let currentTeacher = null;

// Normalize legacy data formats
students.forEach(s => {
  if (!s.grade && s.className) s.grade = s.className;
  if (!s.academicYear) s.academicYear = activeSchoolYear;
  if (!s.years) s.years = {};
  if (s.records && !s.years[activeSchoolYear]) {
    s.years[activeSchoolYear] = s.records;
    delete s.records;
  }
  safeFinance(s);
});

// =============================================================================
// DATA PERSISTENCE & HELPERS
// =============================================================================

function save() {
  localStorage.lipSubjects = JSON.stringify(subjects);
  localStorage.lipStudents = JSON.stringify(students);
  localStorage.lipTeachers = JSON.stringify(teachers);
  localStorage.lipGradingPerms = JSON.stringify(gradingPermissions);
  localStorage.lipSchoolYear = activeSchoolYear;
}

function safeFinance(s) {
  if (!s.finance) {
    s.finance = {
      registrationFee: 0,
      registrationPaid: false,
      registrationDate: "",
      tuitionTotal: 0,
      currency: "USD",
      installments: [0, 0, 0, 0]
    };
  }
  s.finance.installments = (s.finance.installments || [0, 0, 0, 0]).concat([0, 0, 0, 0]).slice(0, 4);
  return s.finance;
}

function money(v, c) {
  return `${c || "USD"} ${Number(v || 0).toFixed(2)}`.trim();
}

function clamp(v) {
  v = Number(v);
  return isNaN(v) ? 0 : Math.max(0, Math.min(100, v));
}

function average(a) {
  return a.length ? a.reduce((x, y) => x + Number(y), 0) / a.length : 0;
}

function gradeInfo(n) {
  n = Number(n);
  if (n <= 69) return { letter: "F", remark: "FAILURE", className: "fail", cellClass: "failCell" };
  if (n <= 80) return { letter: "B", remark: "GOOD", className: "pass", cellClass: "passCell" };
  if (n <= 95) return { letter: "A", remark: "VERY GOOD", className: "pass", cellClass: "passCell" };
  return { letter: "A+", remark: "HONORED", className: "pass", cellClass: "passCell" };
}

function calc(r) {
  let s1 = average([r.p1, r.p2, r.p3, r.exam1]);
  let s2 = average([r.p4, r.p5, r.p6, r.exam2]);
  let year = (s1 + s2) / 2;
  return { s1, s2, year, g: gradeInfo(year) };
}

function gradePoint(n) {
  if (n <= 69) return 0;
  if (n <= 80) return 3;
  if (n <= 95) return 4;
  return 5;
}

function ensureYearData(s, year = activeSchoolYear) {
  if (!s.years) s.years = {};
  if (!s.years[year]) s.years[year] = [];
  return s.years[year];
}

function getRecords(s, year = activeSchoolYear) {
  if (s.years && s.years[year]) return s.years[year];
  return [];
}

function classStudents(s) {
  return students.filter(x => (x.grade || x.className) === (s.grade || s.className));
}

function positionOf(s, year = activeSchoolYear) {
  let peers = classStudents(s);
  let ranked = peers.map(x => ({ s: x, a: overallAverage(x, year) })).sort((a, b) => b.a - a.a);
  let pos = ranked.findIndex(x => x.s.id === s.id) + 1;
  return (pos || 1) + " of " + ranked.length;
}

function overallAverage(s, year = activeSchoolYear) {
  let r = getRecords(s, year);
  if (!r.length) return 0;
  return average(r.map(calc).map(x => x.year));
}

function overallGPA(s, year = activeSchoolYear) {
  let r = getRecords(s, year);
  if (!r.length) return 0;
  return average(r.map(calc).map(x => gradePoint(x.year)));
}

function ageFromDob(dob) {
  if (!dob) return "—";
  let d = new Date(dob), now = new Date();
  let age = now.getFullYear() - d.getFullYear(), m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 ? age : "—";
}

// =============================================================================
// NAVIGATION & PAGE SWITCHING
// =============================================================================

function show(id) {
  document.querySelectorAll(".page").forEach(x => x.classList.remove("active"));
  const target = document.getElementById(id);
  if (target) target.classList.add("active");
  if (id === "admin") {
    renderStudents();
    loadPermissionsForm();
    renderTeachers();
  }
}

function initSchoolYears() {
  const options = schoolYears.map(y => `<option value="${y}" ${y === activeSchoolYear ? "selected" : ""}>${y}</option>`).join("");
  if (document.getElementById("adminSchoolYear")) adminSchoolYear.innerHTML = options;
  if (document.getElementById("newAcademicYear")) newAcademicYear.innerHTML = options;
  if (document.getElementById("newGrade")) newGrade.innerHTML = grades.map(g => `<option value="${g}">${g}</option>`).join("");
  if (document.getElementById("newTeacherGrade")) newTeacherGrade.innerHTML = grades.map(g => `<option value="${g}">${g}</option>`).join("");
}

function changeSchoolYear(year) {
  activeSchoolYear = year;
  save();
  renderStudents();
  if (currentIndex !== null && document.getElementById("records").classList.contains("active")) {
    openRecords(currentIndex);
  }
  if (currentTeacher && document.getElementById("teacher").classList.contains("active")) {
    renderTeacherDashboard();
  }
}

function adminTab(tab) {
  const isStudents = tab === "students";
  const isTeachers = tab === "teachers";
  const isSubjects = tab === "subjects";
  const isCloud = tab === "cloud";

  document.getElementById("studentsTab").classList.toggle("hidden", !isStudents);
  document.getElementById("teachersTab").classList.toggle("hidden", !isTeachers);
  document.getElementById("subjectsTab").classList.toggle("hidden", !isSubjects);
  document.getElementById("cloudTab").classList.toggle("hidden", !isCloud);

  tabBtnStudents.classList.toggle("activeTab", isStudents);
  tabBtnTeachers.classList.toggle("activeTab", isTeachers);
  tabBtnSubjects.classList.toggle("activeTab", isSubjects);
  tabBtnCloud.classList.toggle("activeTab", isCloud);

  if (isTeachers) {
    loadPermissionsForm();
    renderTeachers();
  }
  if (isSubjects) renderSubjects();
  if (isCloud) loadCloudSettings();
}

// =============================================================================
// AUTHENTICATION (STUDENT, TEACHER, ADMIN)
// =============================================================================

function adminLogin() {
  if (auser.value === "NelsonSSuah" && apass.value === "19782006" || auser.value === "admin" && apass.value === "admin123") {
    amsg.textContent = "";
    show("admin");
  } else {
    amsg.textContent = "Invalid username or password";
  }
}

function studentLogin() {
  const idVal = sid.value.trim().toLowerCase();
  const passVal = spass.value.trim();

  let s = students.find(x => String(x.id).trim().toLowerCase() === idVal && String(x.password).trim() === passVal);
  if (!s) {
    smsg.textContent = "Invalid Student ID or password";
    return;
  }
  smsg.textContent = "";
  renderGrade(s);
  show("student");
}

function teacherLogin() {
  const userVal = tuser.value.trim().toLowerCase();
  const passVal = tpass.value.trim();

  let t = teachers.find(x => (x.id.toLowerCase() === userVal || x.name.toLowerCase() === userVal) && x.password === passVal);
  if (!t) {
    tmsg.textContent = "Invalid Teacher ID or password.";
    return;
  }
  tmsg.textContent = "";
  currentTeacher = t;
  renderTeacherDashboard();
  show("teacher");
}

// =============================================================================
// TEACHER DASHBOARD & PERIODIC GRADE SUBMISSION
// =============================================================================

function renderTeacherDashboard() {
  if (!currentTeacher) return;

  teacherGreeting.textContent = `Teacher Dashboard — ${currentTeacher.name}`;
  teacherSubtitle.textContent = `Assigned Class: ${currentTeacher.grade} • Teacher ID: ${currentTeacher.id}`;
  teacherActiveYear.textContent = activeSchoolYear;

  // Render permission status badges
  teacherPermissionsStatus.innerHTML = Object.keys(PERIOD_NAMES).map(key => {
    const isOpen = !!gradingPermissions[key];
    return `
      <div class="permBadge ${isOpen ? "open" : "closed"}">
        ${PERIOD_NAMES[key]}: <b>${isOpen ? "🟢 OPEN for Entry" : "🔒 LOCKED"}</b>
      </div>
    `;
  }).join("");

  // Populate subject dropdown
  teacherSubjectSelect.innerHTML = subjects.map(s => `<option value="${s}">${s}</option>`).join("");
  renderTeacherGradeTable();
}

function renderTeacherGradeTable() {
  if (!currentTeacher) return;
  const sub = teacherSubjectSelect.value || subjects[0];
  const classStudentsList = students.filter(s => (s.grade || s.className) === currentTeacher.grade);

  if (!classStudentsList.length) {
    teacherGradeTableBody.innerHTML = `<tr><td colspan="12">No students enrolled in ${currentTeacher.grade} yet.</td></tr>`;
    return;
  }

  const periodKeys = ["p1", "p2", "p3", "exam1", "p4", "p5", "p6", "exam2"];

  teacherGradeTableBody.innerHTML = classStudentsList.map((s, i) => {
    const records = ensureYearData(s, activeSchoolYear);
    const rec = records.find(r => r.subject === sub) || {
      subject: sub, p1: "", p2: "", p3: "", exam1: "", p4: "", p5: "", p6: "", exam2: ""
    };
    const c = calc(rec);

    const periodCells = periodKeys.map(key => {
      const existingVal = rec[key];
      const hasScore = existingVal !== "" && existingVal !== null && existingVal !== undefined && Number(existingVal) >= 0;
      const isOpen = !!gradingPermissions[key];

      if (hasScore) {
        // PREVIOUSLY ENTERED GRADE: LOCKED TO PREVENT TEACHER EDITING
        return `<td><span class="lockedScore" title="Locked by Admin policy: Only new grades may be submitted.">🔒 ${existingVal}</span></td>`;
      } else if (isOpen) {
        // OPEN FOR NEW GRADE ENTRY
        return `<td><input class="teacherScoreInput" data-sid="${s.id}" data-period="${key}" type="number" min="0" max="100" placeholder="—"></td>`;
      } else {
        // CLOSED FOR ENTRY
        return `<td><span class="disabledCell">Closed</span></td>`;
      }
    }).join("");

    return `
      <tr>
        <td>${i + 1}</td>
        <td class="subject"><b>${s.name}</b><br><small>${s.id}</small></td>
        ${periodCells}
        <td class="avg ${c.year <= 69 ? "failCell" : "passCell"}">${c.year > 0 ? c.year.toFixed(2) + "%" : "—"}</td>
        <td class="grade ${c.g.className}">${c.year > 0 ? c.g.letter : "—"}</td>
      </tr>
    `;
  }).join("");
}

function teacherSaveGrades() {
  if (!currentTeacher) return;
  const sub = teacherSubjectSelect.value;
  const inputs = document.querySelectorAll(".teacherScoreInput");
  let updatedCount = 0;

  inputs.forEach(input => {
    const valStr = input.value.trim();
    if (valStr === "") return;

    const val = clamp(valStr);
    const sId = input.getAttribute("data-sid");
    const period = input.getAttribute("data-period");

    // Double-check periodic permission
    if (!gradingPermissions[period]) return;

    const s = students.find(x => x.id === sId);
    if (!s) return;

    const records = ensureYearData(s, activeSchoolYear);
    let rec = records.find(r => r.subject === sub);

    if (!rec) {
      rec = {
        subject: sub,
        p1: "", p2: "", p3: "", exam1: "",
        p4: "", p5: "", p6: "", exam2: ""
      };
      records.push(rec);
    }

    // ONLY add if no prior grade existed (Anti-Tamper rule)
    if (rec[period] === "" || rec[period] === null || rec[period] === undefined) {
      rec[period] = val;
      updatedCount++;
    }
  });

  if (updatedCount === 0) {
    return alert("No new grades were entered or target periods are currently locked by administration.");
  }

  save();
  renderTeacherGradeTable();
  alert(`Successfully submitted ${updatedCount} grade(s) for ${sub}. Newly submitted grades are now locked.`);
}

// =============================================================================
// ADMIN: TEACHER MANAGEMENT & PERIODIC PERMISSIONS CONTROL
// =============================================================================

function loadPermissionsForm() {
  Object.keys(PERIOD_NAMES).forEach(key => {
    const el = document.getElementById(`perm_${key}`);
    if (el) el.checked = !!gradingPermissions[key];
  });
}

function saveGradingPermissions() {
  Object.keys(PERIOD_NAMES).forEach(key => {
    const el = document.getElementById(`perm_${key}`);
    if (el) gradingPermissions[key] = el.checked;
  });
  save();
  alert("Periodic grading submission permissions updated successfully!");
}

function toggleAllPermissions(enable) {
  Object.keys(PERIOD_NAMES).forEach(key => {
    const el = document.getElementById(`perm_${key}`);
    if (el) el.checked = enable;
    gradingPermissions[key] = enable;
  });
  save();
  alert(enable ? "All assessment periods are now OPEN for teacher submission." : "All assessment periods are now LOCKED.");
}

function addTeacher() {
  if (!newTeacherId.value || !newTeacherName.value || !newTeacherGrade.value || !newTeacherPass.value) {
    return alert("Please complete Teacher ID, Full Name, Assigned Grade, and Password.");
  }

  const cleanId = newTeacherId.value.trim();
  if (teachers.some(t => t.id.toLowerCase() === cleanId.toLowerCase())) {
    return alert("Teacher ID already exists.");
  }

  const newTeacher = {
    id: cleanId,
    name: newTeacherName.value.trim(),
    grade: newTeacherGrade.value,
    password: newTeacherPass.value.trim(),
    phone: newTeacherPhone.value.trim() || ""
  };

  teachers.push(newTeacher);
  save();

  [newTeacherId, newTeacherName, newTeacherPass, newTeacherPhone].forEach(x => x.value = "");
  renderTeachers();
  alert(`Teacher ${newTeacher.name} assigned to ${newTeacher.grade} successfully.`);
}

function renderTeachers() {
  if (document.getElementById("teacherCount")) {
    teacherCount.textContent = teachers.length;
  }

  if (!teachers.length) {
    teacherList.innerHTML = "<div class='box'>No teacher accounts added yet.</div>";
    return;
  }

  teacherList.innerHTML = teachers.map((t, i) => `
    <div class="item">
      <div>
        <b>${t.name}</b> (${t.id})<br>
        <small>Assigned Class: <strong class="pass">${t.grade}</strong> • Phone: ${t.phone || "Not provided"}</small>
      </div>
      <div>
        <button class="danger" onclick="deleteTeacher(${i})">🗑️ Remove Teacher</button>
      </div>
    </div>
  `).join("");
}

function deleteTeacher(i) {
  if (confirm(`Remove teacher account "${teachers[i].name}" (${teachers[i].id})?`)) {
    teachers.splice(i, 1);
    save();
    renderTeachers();
  }
}

// =============================================================================
// STUDENT MANAGEMENT (ADD, RENDER, SEARCH, DELETE)
// =============================================================================

function addStudent() {
  if (!newId.value || !newName.value || !newPass.value || !newGrade.value) {
    return alert("Complete Student ID, Name, Class/Grade, and Password.");
  }
  const cleanId = newId.value.trim();
  if (students.some(s => s.id.toLowerCase() === cleanId.toLowerCase())) {
    return alert("Student ID already exists.");
  }

  const file = newPhoto.files[0];
  const finish = photo => {
    const newStudent = {
      id: cleanId,
      name: newName.value.trim(),
      grade: newGrade.value,
      className: newGrade.value,
      academicYear: newAcademicYear.value || activeSchoolYear,
      password: newPass.value.trim(),
      photo: photo || "",
      dob: newDob.value || "",
      role: newRole.value.trim() || "Student",
      behaviour: newBehaviour.value.trim() || "Good",
      guardian: newGuardian.value.trim(),
      phone: newPhone.value.trim(),
      years: {
        [newAcademicYear.value || activeSchoolYear]: []
      },
      finance: {
        registrationFee: 0,
        registrationPaid: false,
        registrationDate: "",
        tuitionTotal: 0,
        currency: "USD",
        installments: [0, 0, 0, 0]
      }
    };

    students.push(newStudent);
    save();

    [newId, newName, newPass, newRole, newBehaviour, newDob, newGuardian, newPhone].forEach(x => x.value = "");
    newPhoto.value = "";
    renderStudents();
    alert(`Student ${newStudent.name} added successfully.`);
  };

  if (file) {
    const fr = new FileReader();
    fr.onload = () => finish(fr.result);
    fr.readAsDataURL(file);
  } else {
    finish("");
  }
}

function renderStudents(list = students) {
  if (document.getElementById("studentCount")) {
    studentCount.textContent = list.length;
  }

  if (!list.length) {
    studentList.innerHTML = "<div class='box'>No matching student records found.</div>";
    return;
  }

  studentList.innerHTML = list.map(s => {
    const idx = students.indexOf(s);
    const avg = overallAverage(s, activeSchoolYear);
    const g = gradeInfo(avg);
    const f = safeFinance(s);
    const paidSum = f.installments.reduce((a, b) => a + Number(b || 0), 0);
    const balance = Math.max(0, Number(f.tuitionTotal || 0) - paidSum);

    return `
      <div class="item">
        <div class="studentCard">
          ${s.photo ? `<img class="thumb" src="${s.photo}" alt="Student Photo">` : `<div class="thumb">👤</div>`}
          <div>
            <b>${s.name}</b> (${s.id})<br>
            <small>Class: <b>${s.grade || s.className || "—"}</b> • Age: ${ageFromDob(s.dob)} • Role: ${s.role || "Student"}</small><br>
            <small>Academic Year: <b>${activeSchoolYear}</b> • Year Avg: <strong class="${g.className}">${avg.toFixed(2)}%</strong> (${g.letter}) • Rank: <b>${positionOf(s, activeSchoolYear)}</b></small><br>
            <small>Tuition Total: <b>${money(f.tuitionTotal, f.currency)}</b> • Balance: <strong class="${balance > 0 ? "fail" : "pass"}">${money(balance, f.currency)}</strong> • Reg: <b>${f.registrationPaid ? "PAID" : "UNPAID"}</b></small>
          </div>
        </div>
        <div class="studentCardActions">
          <button onclick="openRecords(${idx})">📝 Manage Scores</button>
          <button class="light" onclick="openFinance(${idx})">💳 Manage Tuition & Reg</button>
          <button class="danger" onclick="deleteStudent(${idx})">🗑️ Delete</button>
        </div>
      </div>
    `;
  }).join("");
}

function searchStudents(name) {
  const query = name.trim().toLowerCase();
  const filtered = query
    ? students.filter(s => s.name.toLowerCase().includes(query) || s.id.toLowerCase().includes(query) || (s.grade || "").toLowerCase().includes(query))
    : students;
  renderStudents(filtered);
}

function deleteStudent(i) {
  if (confirm(`Delete student "${students[i].name}" (${students[i].id}) and all associated academic & finance records?`)) {
    students.splice(i, 1);
    save();
    renderStudents();
  }
}

// =============================================================================
// ACADEMIC SCORES MANAGEMENT (ADMIN MASTER OVERRIDE)
// =============================================================================

function openRecords(i) {
  currentIndex = i;
  const s = students[i];
  ensureYearData(s, activeSchoolYear);
  save();

  if (document.getElementById("scoreActiveYear")) {
    scoreActiveYear.textContent = activeSchoolYear;
  }

  recordHeader.innerHTML = `
    <div class="box studentCard">
      ${s.photo ? `<img class="thumb" src="${s.photo}">` : `<div class="thumb">👤</div>`}
      <div>
        <h2>${s.name}</h2>
        <p>${s.id} • Class: <b>${s.grade || s.className || "—"}</b> • Age: <b>${ageFromDob(s.dob)}</b></p>
        <p>Active School Year: <b>${activeSchoolYear}</b> • Position: <b>${positionOf(s, activeSchoolYear)}</b></p>
      </div>
    </div>
  `;

  recordSubject.innerHTML = subjects.map(x => `<option value="${x}">${x}</option>`).join("");
  renderRecords();
  clearForm();
  show("records");
}

function renderRecords() {
  const s = students[currentIndex];
  const r = getRecords(s, activeSchoolYear);

  if (!r.length) {
    recordsList.innerHTML = `<div class="box">No academic records recorded yet for ${activeSchoolYear}.</div>`;
    return;
  }

  recordsList.innerHTML = r.map((x, i) => {
    const c = calc(x);
    return `
      <div class="item">
        <div>
          <b>${x.subject}</b><br>
          <small>1st Sem Avg: <b>${c.s1.toFixed(2)}%</b> • 2nd Sem Avg: <b>${c.s2.toFixed(2)}%</b></small><br>
          <small>Yearly Avg: <strong class="${c.g.className}">${c.year.toFixed(2)}%</strong> • Grade: <strong class="${c.g.className}">${c.g.letter} (${c.g.remark})</strong></small>
        </div>
        <div>
          <button class="light" onclick="editRecord(${i})">✏️ Edit</button>
          <button class="danger" onclick="removeRecord(${i})">🗑️ Delete</button>
        </div>
      </div>
    `;
  }).join("");
}

function saveRecord() {
  const s = students[currentIndex];
  const sub = recordSubject.value;
  const r = {
    subject: sub,
    p1: clamp(p1.value),
    p2: clamp(p2.value),
    p3: clamp(p3.value),
    exam1: clamp(exam1.value),
    p4: clamp(p4.value),
    p5: clamp(p5.value),
    p6: clamp(p6.value),
    exam2: clamp(exam2.value)
  };

  const records = ensureYearData(s, activeSchoolYear);
  const idx = records.findIndex(x => x.subject === sub);
  if (idx >= 0) records[idx] = r;
  else records.push(r);

  save();
  clearForm();
  renderRecords();
  renderStudents();
  alert(`Scores for ${sub} saved for ${activeSchoolYear}.`);
}

function editRecord(i) {
  const r = getRecords(students[currentIndex], activeSchoolYear)[i];
  recordSubject.value = r.subject;
  p1.value = r.p1;
  p2.value = r.p2;
  p3.value = r.p3;
  exam1.value = r.exam1;
  p4.value = r.p4;
  p5.value = r.p5;
  p6.value = r.p6;
  exam2.value = r.exam2;
  window.scrollTo({ top: 120, behavior: "smooth" });
}

function removeRecord(i) {
  if (confirm("Delete this subject score record?")) {
    getRecords(students[currentIndex], activeSchoolYear).splice(i, 1);
    save();
    renderRecords();
    renderStudents();
  }
}

function clearForm() {
  [p1, p2, p3, exam1, p4, p5, p6, exam2].forEach(x => x.value = "");
}

// =============================================================================
// SUBJECT MANAGEMENT
// =============================================================================

function addSubject() {
  const n = newSubject.value.trim();
  if (!n) return;
  if (subjects.includes(n)) return alert("Subject already exists in list.");
  subjects.push(n);
  save();
  newSubject.value = "";
  renderSubjects();
}

function renderSubjects() {
  subjectList.innerHTML = subjects.map((s, i) => `
    <div class="item">
      <b>${s}</b>
      <button class="danger" onclick="deleteSubject(${i})">Delete Subject</button>
    </div>
  `).join("");
}

function deleteSubject(i) {
  if (confirm(`Remove subject "${subjects[i]}"?`)) {
    subjects.splice(i, 1);
    save();
    renderSubjects();
  }
}

// =============================================================================
// TUITION & REGISTRATION FINANCE MANAGEMENT
// =============================================================================

function openFinance(i) {
  currentIndex = i;
  const s = students[i];
  safeFinance(s);

  financeRecordHeader.innerHTML = `
    <div class="box studentCard">
      ${s.photo ? `<img class="thumb" src="${s.photo}">` : `<div class="thumb">👤</div>`}
      <div>
        <h2>${s.name}</h2>
        <p>${s.id} • Class: <b>${s.grade || s.className || "—"}</b> • Academic Year: <b>${activeSchoolYear}</b></p>
        <p>Guardian: <b>${s.guardian || "Not provided"}</b> • Phone: <b>${s.phone || "Not provided"}</b></p>
      </div>
    </div>
  `;

  loadFinance();
  show("financePage");
}

function loadFinance() {
  const f = safeFinance(students[currentIndex]);
  registrationFee.value = f.registrationFee || 0;
  registrationPaid.checked = !!f.registrationPaid;
  registrationDate.value = f.registrationDate || "";
  tuitionTotal.value = f.tuitionTotal || 0;
  currency.value = f.currency || "USD";

  [inst1, inst2, inst3, inst4].forEach((el, i) => {
    el.value = f.installments[i] || 0;
  });
  updateFinanceCalc();
}

function updateFinanceCalc() {
  const total = Number(tuitionTotal.value || 0);
  const vals = [inst1.value, inst2.value, inst3.value, inst4.value].map(Number);
  const sum = vals.reduce((a, b) => a + (isFinite(b) ? b : 0), 0);
  const balance = total - sum;

  financeCalc.innerHTML = `
    <div><b>Total Installments Recorded:</b> ${money(sum, currency.value)}</div>
    <div><b>Remaining Balance:</b> <span class="${balance <= 0 ? "pass" : "fail"}">${money(balance, currency.value)}</span></div>
    <small class="muted">Rule: The 4 installments cannot exceed total tuition amount.</small>
  `;
}

[tuitionTotal, inst1, inst2, inst3, inst4, currency].forEach(el => {
  if (el) el.addEventListener("input", updateFinanceCalc);
});

function saveFinance() {
  const s = students[currentIndex];
  const vals = [inst1, inst2, inst3, inst4].map(x => Math.max(0, Number(x.value || 0)));
  const total = Math.max(0, Number(tuitionTotal.value || 0));

  if (vals.reduce((a, b) => a + b, 0) > total + 0.000001 && total > 0) {
    return alert("The 4 installments cannot exceed the total tuition amount.");
  }

  const f = safeFinance(s);
  f.registrationFee = Math.max(0, Number(registrationFee.value || 0));
  f.registrationPaid = registrationPaid.checked;
  f.registrationDate = registrationDate.value || "";
  f.tuitionTotal = total;
  f.currency = currency.value.trim() || "USD";
  f.installments = vals;

  save();
  loadFinance();
  renderStudents();
  alert("Tuition and registration records saved successfully.");
}

function clearFinance() {
  if (!confirm("Clear registration and tuition payment records for this student?")) return;
  students[currentIndex].finance = {
    registrationFee: 0,
    registrationPaid: false,
    registrationDate: "",
    tuitionTotal: 0,
    currency: "USD",
    installments: [0, 0, 0, 0]
  };
  save();
  loadFinance();
  renderStudents();
}

// =============================================================================
// STUDENT DASHBOARD & REPORT CARD RENDERING
// =============================================================================

function scoreCell(v) {
  const n = Number(v);
  const c = n <= 69 ? "failCell" : "passCell";
  return `<td class="score ${c}">${n}</td>`;
}

function renderGrade(s) {
  const r = getRecords(s, activeSchoolYear);
  const pos = positionOf(s, activeSchoolYear);
  const yearAvg = overallAverage(s, activeSchoolYear);
  const gpa = overallGPA(s, activeSchoolYear);
  const avgS1 = average(r.map(calc).map(x => x.s1));
  const avgS2 = average(r.map(calc).map(x => x.s2));
  const og = gradeInfo(yearAvg);

  const f = safeFinance(s);
  const paidSum = f.installments.reduce((a, b) => a + Number(b || 0), 0);
  const balance = Math.max(0, Number(f.tuitionTotal || 0) - paidSum);

  const photo = s.photo
    ? `<img class="studentDashPhoto" src="${s.photo}" alt="Student Photo">`
    : `<div class="studentDashPhoto placeholderPhoto">👤</div>`;

  gradeSheet.innerHTML = `
    <div class="studentDashboard">
      <div class="studentHeader">
        <div>
          <div class="schoolName">LIBERTY PRAYER DELIVERANCE MINISTRIES SCHOOL SYSTEM</div>
          <div class="lip">LiPDMiSS</div>
          <div class="motto">FAITH • EXCELLENCE • DISCIPLINE • PURPOSE</div>
        </div>
        <div class="userBox">
          <div class="userIcon">👤</div>
          <div>
            Hello, <b>${s.name}</b><br>
            <span>${s.id}</span>
          </div>
        </div>
      </div>

      <div class="dashboardGrid">
        <div class="panel">
          <h3 class="dashboardTitle">👤 STUDENT PROFILE & INFORMATION</h3>
          <div class="studentInfoPanel">
            <div class="studentInfoRows">
              <div><b>Student ID:</b><br>${s.id}</div>
              <div><b>Student Name:</b><br>${s.name}</div>
              <div><b>Class / Grade:</b><br>${s.grade || s.className || "—"}</div>
              <div><b>Academic Year:</b><br>${activeSchoolYear}</div>
              <div><b>Date of Birth:</b><br>${s.dob || "—"} (Age: ${ageFromDob(s.dob)})</div>
              <div><b>Role in School:</b><br>${s.role || "Student"}</div>
              <div><b>Behaviour Assessment:</b><br>${s.behaviour || "Good"}</div>
              <div><b>Class Position:</b><br><b>${pos}</b></div>
              <div><b>Guardian / Phone:</b><br>${s.guardian || "—"} (${s.phone || "—"})</div>
              <div><b>Academic Status:</b><br><span class="${og.className}"><b>${og.remark}</b></span></div>
            </div>
            <div class="photoBox">${photo}</div>
          </div>
        </div>

        <div class="panel">
          <h3 class="dashboardTitle">📊 ACADEMIC SUMMARY</h3>
          <div class="summaryStats">
            <div>
              <small>TOTAL SUBJECTS</small>
              <strong>${r.length}</strong>
            </div>
            <div>
              <small>YEAR AVERAGE</small>
              <strong class="${og.className}">${yearAvg.toFixed(2)}%</strong>
            </div>
            <div>
              <small>GPA POINT</small>
              <strong class="${og.className}">${gpa.toFixed(2)}</strong>
            </div>
          </div>
          <div class="summaryRemark">
            <small>OVERALL REMARK</small>
            <strong class="${og.className}">${og.remark} (${og.letter})</strong>
          </div>
        </div>
      </div>

      <div class="panel tablePanel">
        <h3 class="dashboardTitle">📚 SUBJECT PERFORMANCE <span class="schoolYearBadge">${activeSchoolYear}</span></h3>
        <div class="tableWrap">
          <table class="scoreTable">
            <thead>
              <tr>
                <th>#</th>
                <th>SUBJECT</th>
                <th>1st PD</th>
                <th>2nd PD</th>
                <th>3rd PD</th>
                <th>EXAM</th>
                <th>1ST SEM AVG</th>
                <th>4th PD</th>
                <th>5th PD</th>
                <th>6th PD</th>
                <th>EXAM</th>
                <th>2ND SEM AVG</th>
                <th>YEAR AVG</th>
                <th>GRADE</th>
                <th>REMARK</th>
              </tr>
            </thead>
            <tbody>
              ${r.length ? r.map((x, i) => {
                const c = calc(x);
                return `
                  <tr>
                    <td>${i + 1}</td>
                    <td class="subject">${x.subject}</td>
                    ${scoreCell(x.p1)}
                    ${scoreCell(x.p2)}
                    ${scoreCell(x.p3)}
                    ${scoreCell(x.exam1)}
                    <td class="avg ${c.s1 <= 69 ? "failCell" : "passCell"}">${c.s1.toFixed(2)}%</td>
                    ${scoreCell(x.p4)}
                    ${scoreCell(x.p5)}
                    ${scoreCell(x.p6)}
                    ${scoreCell(x.exam2)}
                    <td class="avg ${c.s2 <= 69 ? "failCell" : "passCell"}">${c.s2.toFixed(2)}%</td>
                    <td class="avg ${c.year <= 69 ? "failCell" : "passCell"}">${c.year.toFixed(2)}%</td>
                    <td class="grade ${c.g.className}">${c.g.letter}</td>
                    <td class="remark ${c.g.className}">${c.g.remark}</td>
                  </tr>
                `;
              }).join("") : `<tr><td colspan="15">No academic score records available for ${activeSchoolYear}.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>

      <div class="bottomStats">
        <div class="stat">1ST SEMESTER AVERAGE<br><b class="${avgS1 <= 69 ? "fail" : "pass"}">${avgS1.toFixed(2)}%</b></div>
        <div class="stat">2ND SEMESTER AVERAGE<br><b class="${avgS2 <= 69 ? "fail" : "pass"}">${avgS2.toFixed(2)}%</b></div>
        <div class="stat">YEARLY AVERAGE<br><b class="${og.className}">${yearAvg.toFixed(2)}%</b></div>
        <div class="stat position">CLASS POSITION<br><b>${pos}</b></div>
      </div>

      <!-- FINANCE & TUITION LEDGER PANEL -->
      <div class="paymentPanel">
        <h3 class="dashboardTitle">💳 TUITION & REGISTRATION STATUS</h3>
        <div class="paymentGrid">
          <div>
            <span>Registration Fee</span>
            <b>${money(f.registrationFee, f.currency)}</b>
            <small class="${f.registrationPaid ? "pass" : "fail"}">${f.registrationPaid ? "PAID" : "UNPAID"}</small>
          </div>
          <div>
            <span>Tuition Total (Annual)</span>
            <b>${money(f.tuitionTotal, f.currency)}</b>
            <small class="muted">${activeSchoolYear}</small>
          </div>
          <div>
            <span>Total Tuition Paid</span>
            <b>${money(paidSum, f.currency)}</b>
            <small class="pass">4 installments sum</small>
          </div>
          <div>
            <span>Tuition Balance</span>
            <b>${money(balance, f.currency)}</b>
            <small class="${balance === 0 && f.tuitionTotal > 0 ? "pass" : "fail"}">${balance === 0 && f.tuitionTotal > 0 ? "COMPLETED" : "REMAINING"}</small>
          </div>
        </div>
        <div class="installmentView">
          ${f.installments.map((v, i) => `
            <div>
              <span>Installment ${i + 1}</span>
              <b>${money(v, f.currency)}</b>
            </div>
          `).join("")}
        </div>
        <p class="muted">Note: Payments are recorded by school administration. This portal does not process live online banking payments.</p>
      </div>
    </div>
  `;
}

function printGrade() {
  window.print();
}

// =============================================================================
// GOOGLE APPS SCRIPT BACKEND CLOUD SYNC
// =============================================================================

function loadCloudSettings() {
  if (document.getElementById("backendUrlInput")) {
    backendUrlInput.value = localStorage.getItem("lipBackendUrl") || "";
  }
}

function saveBackendUrl() {
  const url = backendUrlInput.value.trim();
  localStorage.setItem("lipBackendUrl", url);
  cloudStatus.textContent = "Backend URL saved successfully.";
}

async function testBackendConnection() {
  const url = localStorage.getItem("lipBackendUrl");
  if (!url) return alert("Please enter and save your Google Apps Script Web App URL first.");
  cloudStatus.textContent = "Connecting to Google Apps Script...";
  try {
    const res = await fetch(`${url}?action=ping`, { method: "GET", redirect: "follow" });
    const data = await res.json();
    if (data.success) {
      cloudStatus.innerHTML = `<span class="pass"><b>Online:</b> ${data.message} (${data.timestamp})</span>`;
    } else {
      cloudStatus.innerHTML = `<span class="error"><b>Error:</b> ${data.message}</span>`;
    }
  } catch (err) {
    cloudStatus.innerHTML = `<span class="error"><b>Connection failed:</b> ${err.message}</span>`;
  }
}

async function initCloudDatabase() {
  const url = localStorage.getItem("lipBackendUrl");
  if (!url) return alert("Please enter and save your Google Apps Script Web App URL first.");
  cloudStatus.textContent = "Initializing Google Sheets tables...";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "initDatabase" })
    });
    const data = await res.json();
    cloudStatus.innerHTML = `<span class="pass"><b>Result:</b> ${data.message}</span>`;
    alert(data.message);
  } catch (err) {
    cloudStatus.innerHTML = `<span class="error"><b>Init failed:</b> ${err.message}</span>`;
  }
}

async function syncLocalToCloud() {
  const url = localStorage.getItem("lipBackendUrl");
  if (!url) return alert("Please enter and save your Google Apps Script Web App URL first.");
  if (!confirm(`Sync ${students.length} students, ${teachers.length} teachers, and permissions to Google Sheets?`)) return;

  cloudStatus.textContent = "Syncing local database to Google Sheets...";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "syncAll",
        students: students,
        teachers: teachers,
        subjects: subjects,
        permissions: gradingPermissions,
        activeSchoolYear: activeSchoolYear
      })
    });
    const data = await res.json();
    cloudStatus.innerHTML = `<span class="pass"><b>Sync Success:</b> ${data.message}</span>`;
    alert("Sync completed successfully!");
  } catch (err) {
    cloudStatus.innerHTML = `<span class="error"><b>Sync failed:</b> ${err.message}</span>`;
  }
}

// =============================================================================
// INITIALIZATION ON PAGE LOAD
// =============================================================================

initSchoolYears();
renderStudents();
loadPermissionsForm();
renderTeachers();
