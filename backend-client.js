/* Learnix backend adapter: Supabase Auth + PostgreSQL via Row Level Security. */
(() => {
  const config = window.LEARNIX_SUPABASE_CONFIG || {};
  const configured = Boolean(config.url && config.anonKey && !config.url.includes("YOUR-PROJECT-ID") && !config.anonKey.includes("YOUR_SUPABASE_ANON_KEY"));
  let client = null;
  if (configured && window.supabase?.createClient) {
    client = window.supabase.createClient(config.url, config.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
  }
  const backend = {
    get enabled() { return Boolean(client); },
    status() { return client ? "connected" : "demo"; },
    async signUp({ name, email, password, role, semester = "", department = "" }) {
      if (!client) throw new Error("Backend is not configured yet. Add your Supabase URL and anon key to supabase-config.js.");
      const { data, error } = await client.auth.signUp({
        email, password,
        options: { data: { full_name: name, role, semester: role === "student" ? semester : null, department: role === "teacher" ? department : null } }
      });
      if (error) throw error;
      if (!data.user) throw new Error("Account creation did not complete. Please try again.");
      if (!data.session) return { needsEmailConfirmation: true, user: data.user };
      const profile = await this.getMyProfile();
      return { user: data.user, profile };
    },
    async signIn({ email, password, expectedRole }) {
      if (!client) throw new Error("Backend is not configured yet. Add your Supabase URL and anon key to supabase-config.js.");
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const profile = await this.getMyProfile();
      if (!profile || profile.role !== expectedRole) {
        await client.auth.signOut();
        throw new Error(`This account is not registered as a ${expectedRole}. Select the correct account type.`);
      }
      return { user: data.user, profile };
    },
    async getMyProfile() {
      if (!client) return null;
      const { data: { user }, error: authError } = await client.auth.getUser();
      if (authError) throw authError;
      if (!user) return null;
      const { data, error } = await client.from("profiles").select("id, full_name, email, role, semester, department, student_id, employee_id, program, target_cgpa, created_at").eq("id", user.id).single();
      if (error) throw error;
      return data;
    },
    async signOut() { if (client) { const { error } = await client.auth.signOut(); if (error) throw error; } },
    async saveMyProfile(changes) {
      if (!client) throw new Error("Supabase is not configured.");
      const { data: { user }, error: authError } = await client.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error("Please sign in again.");
      const allowed = {};
      ["full_name", "semester", "department", "student_id", "employee_id", "program", "target_cgpa"].forEach(k => { if (k in changes) allowed[k] = changes[k]; });
      const { data, error } = await client.from("profiles").update(allowed).eq("id", user.id).select().single();
      if (error) throw error;
      return data;
    },
    async listMyAssignments() {
      if (!client) throw new Error("Supabase is not configured.");
      const { data, error } = await client.from("assignments")
        .select("id,title,description,due_at,max_marks,course_id,created_by,created_at,courses(title,code,semester)")
        .order("due_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    async listMyCourses() {
      if (!client) throw new Error("Supabase is not configured.");
      const { data: { user }, error: authError } = await client.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error("Please sign in again.");
      const { data: profile, error: profileError } = await client.from("profiles").select("role").eq("id", user.id).single();
      if (profileError) throw profileError;
      if (profile.role === "teacher" || profile.role === "admin") {
        const { data, error } = await client.from("courses").select("id,title,code,semester,teacher_id").eq("teacher_id", user.id).order("title");
        if (error) throw error;
        return data || [];
      }
      const { data, error } = await client.from("course_memberships").select("course_id,courses(id,title,code,semester,teacher_id)");
      if (error) throw error;
      return (data || []).map(x => x.courses).filter(Boolean);
    },
    async createCourse({ title, code, semester = "" }) {
      if (!client) throw new Error("Supabase is not configured.");
      const { data: { user }, error: authError } = await client.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error("Please sign in again.");
      const { data, error } = await client.from("courses").insert({ title, code, semester: semester || null, teacher_id: user.id }).select().single();
      if (error) throw error;
      return data;
    },
    async enrollStudent({ courseId, email }) {
      if (!client) throw new Error("Supabase is not configured.");
      const { error } = await client.rpc("learnix_enroll_student", { target_course: courseId, student_email: email });
      if (error) throw error;
      return true;
    },
    async createAssignment({ courseId, title, description = "", dueAt, maxMarks = 100 }) {
      if (!client) throw new Error("Supabase is not configured.");
      const { data: { user }, error: authError } = await client.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error("Please sign in again.");
      const { data, error } = await client.from("assignments").insert({ course_id: courseId, created_by: user.id, title, description, due_at: dueAt, max_marks: maxMarks }).select("id,title,description,due_at,max_marks,course_id,created_by,created_at,courses(title,code,semester)").single();
      if (error) throw error;
      return data;
    },
    async saveMyCheckin({ energy, focus, confidence, note = "" }) {
      if (!client) throw new Error("Supabase is not configured.");
      const { data: { user }, error: authError } = await client.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error("Please sign in again.");
      const { data, error } = await client.from("student_checkins").insert({ student_id: user.id, energy, focus, confidence, note }).select().single();
      if (error) throw error;
      return data;
    },
    async listMyCheckins() {
      if (!client) throw new Error("Supabase is not configured.");
      const { data, error } = await client.from("student_checkins").select("id,energy,focus,confidence,note,created_at").order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data || [];
    }
  };
  window.LearnixBackend = Object.freeze(backend);
})();
