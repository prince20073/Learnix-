/* Learnix login / sign-up page — depends on core.js */
class AuthPage {
  constructor() {
    this.$ = id => document.getElementById(id);
    this.role = "student";
    this.mode = "signin";
    this.el = {
      signinTab: this.$("signin-tab"), signupTab: this.$("signup-tab"),
      signinForm: this.$("signin-form"), signupForm: this.$("signup-form"), notice: this.$("notice"),
    };
    this.restoreProfile();
    this.bind();
    this.render();
    this.clearNotice();
  }

  get isStudent() { return this.role === "student"; }
  get isSignup() { return this.mode === "signup"; }

  /* ---------- events ---------- */
  bind() {
    const { signinTab, signupTab, signinForm, signupForm } = this.el;
    document.querySelectorAll("[data-role]").forEach(b => b.addEventListener("click", () => this.setRole(b.dataset.role)));
    document.querySelectorAll("[data-toggle]").forEach(b => b.addEventListener("click", () => this.togglePassword(b)));
    signinTab.addEventListener("click", () => this.setMode("signin"));
    signupTab.addEventListener("click", () => this.setMode("signup"));
    this.$("switch-prompt").addEventListener("click", e => {
      const b = e.target.closest("button");
      if (b) this.setMode(b.id === "switch-to-signin" ? "signin" : "signup");
    });
    signupForm.addEventListener("submit", e => { e.preventDefault(); this.signUp(); });
    signinForm.addEventListener("submit", e => { e.preventDefault(); this.signIn(); });
    this.$("forgot-btn").addEventListener("click", () => this.forgotPassword());
    this.$("signup-password").addEventListener("input", e => this.updateStrength(e.target.value));
    this.$("terms-link").addEventListener("click", e => {
      e.preventDefault();
      this.notify(window.LearnixBackend?.enabled ? "Use a unique password. Supabase handles authentication and database policies protect data." : "Backend setup is not finished. This mode uses browser-only demo accounts; do not use a real or reused password.", "info");
    });
  }

  /* ---------- state ---------- */
  restoreProfile() {
    const saved = Store.read(Session.PROFILE_KEY);
    if (!saved?.email) return;
    this.$("signin-email").value = saved.email;
    if (saved.role) this.role = saved.role;
  }
  setRole(role) { this.role = role; this.render(); this.clearNotice(); }
  setMode(mode) { this.mode = mode; this.render(); this.clearNotice(); }

  /* ---------- rendering (single source of truth) ---------- */
  render() {
    const { $, isStudent, isSignup } = this;
    const { signinTab, signupTab, signinForm, signupForm } = this.el;
    document.querySelectorAll("[data-role]").forEach(o => {
      const active = o.dataset.role === this.role;
      o.classList.toggle("active", active);
      o.setAttribute("aria-pressed", String(active));
    });
    signinTab.classList.toggle("active", !isSignup);
    signupTab.classList.toggle("active", isSignup);
    signinTab.setAttribute("aria-selected", String(!isSignup));
    signupTab.setAttribute("aria-selected", String(isSignup));
    signinForm.classList.toggle("hidden", isSignup);
    signupForm.classList.toggle("hidden", !isSignup);

    const label = isStudent ? "Student email" : "Teacher email";
    $("signin-email-label").textContent = label;
    $("signup-email-label").textContent = label;
    $("form-kicker").textContent = isSignup ? "START YOUR JOURNEY" : "WELCOME BACK";
    $("form-title").textContent = isSignup ? "Create your account" : "Sign in to Learnix";
    $("form-subtitle").textContent = AuthPage.SUBTITLES[this.role][this.mode];

    $("student-semester-field").classList.toggle("hidden", !isStudent);
    $("signup-semester").required = isStudent;
    $("teacher-department-field").classList.toggle("hidden", isStudent);
    $("signup-department").required = !isStudent;
    signupForm.querySelector(".submit-btn span").textContent = `Create my ${this.role} account`;
    $("switch-prompt").innerHTML = isSignup
      ? 'Already have an account? <button type="button" class="text-link" id="switch-to-signin">Sign in instead</button>'
      : `New to Learnix? <button type="button" class="text-link" id="switch-to-signup">Create a ${this.role} account</button>`;
  }

  notify(message, type = "info") { this.el.notice.textContent = message; this.el.notice.className = `notice ${type}`; }
  clearNotice() { this.el.notice.textContent = ""; this.el.notice.className = "notice hidden"; }

  togglePassword(button) {
    const input = this.$(button.dataset.toggle);
    const reveal = input.type === "password";
    input.type = reveal ? "text" : "password";
    button.textContent = reveal ? "Hide" : "Show";
    button.setAttribute("aria-label", reveal ? "Hide password" : "Show password");
  }

  updateStrength(value) {
    const s = Validator.passwordStrength(value);
    const fill = this.$("strength-fill");
    fill.style.width = s.width;
    fill.style.background = s.color;
    this.$("strength-text").textContent = s.label;
  }

  /* ---------- actions ---------- */
  async signUp() {
    this.clearNotice();
    const v = id => this.$(id).value;
    const name = v("signup-name").trim(), email = v("signup-email").trim().toLowerCase(), password = v("signup-password");
    const semester = this.isStudent ? v("signup-semester") : "";
    const department = this.isStudent ? "" : v("signup-department").trim();
    const roleFieldMissing = this.isStudent ? !semester : !department;
    if (!name || roleFieldMissing || !Validator.email(email) || password.length < 8 || !this.$("agree-terms").checked) {
      const field = this.isStudent ? "semester" : "department";
      return this.notify(`Please complete your name and ${field}, enter a valid email, use at least 8 characters for your password, and accept the terms.`, "error");
    }
    if (window.LearnixBackend?.enabled) {
      try {
        const result = await window.LearnixBackend.signUp({ name, email, password, role: this.role, semester, department });
        this.el.signupForm.reset(); this.updateStrength(""); this.setMode("signin"); this.$("signin-email").value = email;
        this.notify(result.needsEmailConfirmation ? "Account created. Check your email to confirm it, then sign in." : `Your ${this.role} account has been created. Sign in to continue.`, "success");
      } catch (error) { this.notify(error.message || "Could not create account. Please try again.", "error"); }
      return;
    }
    if (UserRepository.findByEmail(email)) return this.notify("An account with this email already exists in this browser. Please sign in instead.", "error");
    const UserType = this.isStudent ? Student : Teacher;
    const user = new UserType({ name, email, password, semester, department });
    try { UserRepository.add(user); } catch (error) { return this.notify(error.message, "error"); }
    Store.write(Session.PROFILE_KEY, user.toProfile()); this.el.signupForm.reset(); this.updateStrength(""); this.setMode("signin"); this.$("signin-email").value = email;
    this.notify(`Demo ${this.role} account created in this browser. Sign in with this email and password to open your own workspace.`, "success");
  }

  async signIn() {
    this.clearNotice();
    const email = this.$("signin-email").value.trim().toLowerCase();
    const password = this.$("signin-password").value;
    if (!Validator.email(email) || !password) return this.notify(`Enter a valid ${this.role} email and your password.`, "error");
    if (window.LearnixBackend?.enabled) {
      try {
        const { profile } = await window.LearnixBackend.signIn({ email, password, expectedRole: this.role });
        const portal = profile.role === "teacher" ? AuthPage.PORTALS.teacher : AuthPage.PORTALS.student;
        Store.write(Session.KEY, { id: profile.id, name: profile.full_name, email: profile.email, semester: profile.semester || "", department: profile.department || "", role: profile.role, signedInAt: new Date().toISOString(), remember: this.$("remember-me").checked, backend: true });
        Store.write(Session.PROFILE_KEY, { name: profile.full_name, email: profile.email, semester: profile.semester || "", department: profile.department || "", role: profile.role, program: profile.program || "B.Tech CSE", targetCgpa: profile.target_cgpa || 7.5 });
        this.notify(`Welcome back, ${profile.full_name || profile.email}! Opening your ${profile.role} workspace…`, "success");
        setTimeout(() => { window.location.href = portal; }, 500);
      } catch (error) { this.notify(error.message || "Sign-in failed. Please try again.", "error"); }
      return;
    }
    const user = UserRepository.all().find(u => u.matches(email, password, this.role));
    if (!user) return this.notify(`We couldn't find a matching ${this.role} demo account. Make sure you selected the same role used when creating the account.`, "error");
    Session.start(user, this.$("remember-me").checked);
    this.notify(`Welcome back, ${user.name}! Opening your ${this.role} workspace…`, "success");
    setTimeout(() => { window.location.href = (user instanceof Student ? user.portal : user instanceof Teacher ? user.portal : AuthPage.PORTALS[this.role]); }, 650);
  }

  forgotPassword() {
    const email = this.$("signin-email").value.trim().toLowerCase();
    if (!Validator.email(email)) {
      return this.notify(`Enter your ${this.role} email first. In this demo, password recovery is not connected to email.`, "info");
    }
    this.notify(UserRepository.findByEmail(email)
      ? "This is a browser-only demo, so email recovery is unavailable. Create a new demo account with another email if needed."
      : `No demo account was found for this email. Create a ${this.role} account to get started.`, "info");
  }
}

AuthPage.PORTALS = { student: "student-portal.html", teacher: "teacher-portal.html" };
AuthPage.SUBTITLES = {
  student: { signin: "Pick up where your learning journey left off.", signup: "Set up your student learning space and take your next step." },
  teacher: { signin: "Sign in to your teaching and class workspace.", signup: "Set up your teaching and class workspace." },
};

document.addEventListener("DOMContentLoaded", () => new AuthPage());
