/* Learnix shared OOP core — browser-only demo. No backend/auth service is connected. */
class Store {
  static read(key, fallback = null) {
    try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; }
    catch { return fallback; }
  }
  static write(key, value) { localStorage.setItem(key, JSON.stringify(value)); return value; }
  static remove(key) { localStorage.removeItem(key); }
}

class User {
  #password;
  constructor({ name, email, password = "", role = "student", semester = "", department = "", createdAt = new Date().toISOString() }) {
    this.name = String(name || "").trim();
    this.email = String(email || "").trim().toLowerCase();
    this.#password = String(password);
    this.role = role;
    this.semester = semester;
    this.department = department;
    this.createdAt = createdAt;
  }
  get isStudent() { return this.role === "student"; }
  matches(email, password, role) { return this.email === String(email).trim().toLowerCase() && this.#password === String(password) && this.role === role; }
  toRecord() { return { name: this.name, email: this.email, password: this.#password, role: this.role, semester: this.semester, department: this.department, createdAt: this.createdAt }; }
  toProfile() { return { name: this.name, email: this.email, semester: this.semester, department: this.department, role: this.role }; }
}

class Student extends User {
  constructor(data = {}) { super({ ...data, role: "student" }); }
  get portal() { return "student-portal.html"; }
  toProfile() { return { ...super.toProfile(), program: "B.Tech", semester: this.semester }; }
}

class Teacher extends User {
  constructor(data = {}) { super({ ...data, role: "teacher" }); }
  get portal() { return "teacher-portal.html"; }
  toProfile() { return { ...super.toProfile(), title: "Faculty / Instructor" }; }
}

class UserRepository {
  static KEY = "learnix_demo_users";
  static all() { return Store.read(this.KEY, []).map(data => data.role === "teacher" ? new Teacher(data) : new Student(data)); }
  static findByEmail(email) { return this.all().find(user => user.email === String(email).trim().toLowerCase()); }
  static add(user) {
    if (!(user instanceof User)) throw new TypeError("UserRepository accepts User objects only.");
    if (this.findByEmail(user.email)) throw new Error("An account with this email already exists.");
    Store.write(this.KEY, [...Store.read(this.KEY, []), user.toRecord()]);
    return user;
  }
}

class Session {
  static KEY = "learnix_demo_session";
  static PROFILE_KEY = "learnix_demo_profile";
  static start(user, remember = false) {
    const session = { name: user.name, email: user.email, semester: user.semester, department: user.department, role: user.role, signedInAt: new Date().toISOString(), remember: Boolean(remember) };
    Store.write(this.KEY, session);
    Store.write(this.PROFILE_KEY, user.toProfile());
    return session;
  }
  static current() { return Store.read(this.KEY); }
  static end() { Store.remove(this.KEY); }
  static requireRole(role, loginPage = "index.html") {
    const session = this.current();
    if (!session || session.role !== role) {
      if (location.protocol !== "file:") window.location.replace(loginPage);
      return null;
    }
    return session;
  }
}

class Validator {
  static email(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "")); }
  static passwordStrength(value) {
    const password = String(value || "");
    const score = [password.length >= 8, /[A-Z]/.test(password) && /[a-z]/.test(password), /\d/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length;
    return { score, width: ["0%", "25%", "50%", "75%", "100%"][score], label: ["Password strength", "Weak password", "Fair password", "Good password", "Strong password"][score], color: ["#e9edf6", "#e46f77", "#e5a34a", "#61b99a", "#37ad8b"][score] };
  }
}

class Html {
  static escape(value = "") { return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])); }
}

class Assignment {
  constructor({ id = Date.now(), title, className = "", due, instructions = "", createdAt = new Date().toISOString(), status = "open" }) {
    this.id = id; this.title = String(title || "").trim(); this.className = className; this.due = due; this.instructions = instructions; this.createdAt = createdAt; this.status = status;
  }
  get isOverdue() { return Boolean(this.due) && new Date(`${this.due}T23:59:59`) < new Date() && this.status !== "completed"; }
  validate() { return Boolean(this.title && this.due && this.className); }
  toRecord() { return { id: this.id, title: this.title, className: this.className, due: this.due, instructions: this.instructions, createdAt: this.createdAt, status: this.status }; }
}

class AssignmentRepository {
  static all(key = "learnix_teacher_assignments") { return Store.read(key, []).map(item => new Assignment(item)); }
  static saveAll(assignments, key = "learnix_teacher_assignments") { return Store.write(key, assignments.map(item => item instanceof Assignment ? item.toRecord() : item)); }
  static add(assignment, key = "learnix_teacher_assignments") {
    if (!(assignment instanceof Assignment) || !assignment.validate()) throw new TypeError("A valid Assignment object is required.");
    const items = this.all(key); items.push(assignment); this.saveAll(items, key); return assignment;
  }
}

class StudentProgress {
  #data;
  constructor(data = {}) { this.#data = { cgpa: 0, targetCgpa: 7.5, courseProgress: 0, ...data }; }
  get cgpa() { return Number(this.#data.cgpa) || 0; }
  get targetCgpa() { return Number(this.#data.targetCgpa) || 0; }
  get courseProgress() { return Math.min(100, Math.max(0, Number(this.#data.courseProgress) || 0)); }
  get targetGap() { return Math.max(0, this.targetCgpa - this.cgpa); }
  get isOnTarget() { return this.cgpa >= this.targetCgpa; }
  toSummary() { return { cgpa: this.cgpa, targetCgpa: this.targetCgpa, courseProgress: this.courseProgress, targetGap: Number(this.targetGap.toFixed(2)), isOnTarget: this.isOnTarget }; }
}

class ConsistencyScore {
  static calculate(habits = {}) {
    const keys = ["study", "review", "break", "plan"];
    const completed = keys.filter(key => Boolean(habits[key])).length;
    return { completed, total: keys.length, score: Math.round(completed / keys.length * 100), message: completed ? `${completed} of ${keys.length} habits completed today.` : "Start with one small habit today." };
  }
}

class AttendanceRecord {
  constructor({ studentId, date = new Date().toISOString().slice(0, 10), status = "present", subject = "" }) { this.studentId = studentId; this.date = date; this.status = status; this.subject = subject; }
  get isPresent() { return this.status === "present"; }
  toRecord() { return { studentId: this.studentId, date: this.date, status: this.status, subject: this.subject }; }
}

// Expose the domain model for classic scripts and browser console testing.
window.Learnix = Object.freeze({ Store, User, Student, Teacher, UserRepository, Session, Validator, Html, Assignment, AssignmentRepository, StudentProgress, ConsistencyScore, AttendanceRecord });
