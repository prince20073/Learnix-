-- Learnix initial backend schema for Supabase PostgreSQL.
-- Run this in Supabase Dashboard > SQL Editor. Review policies before production use.
create extension if not exists pgcrypto;

create type public.learnix_role as enum ('student', 'teacher', 'admin');
create type public.attendance_status as enum ('present', 'absent', 'late', 'excused');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null,
  role public.learnix_role not null default 'student',
  semester text,
  department text,
  student_id text unique,
  employee_id text unique,
  program text default 'B.Tech CSE',
  target_cgpa numeric(3,2) not null default 7.50 check (target_cgpa between 0 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  code text not null,
  semester text,
  teacher_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique(code, semester)
);

create table if not exists public.course_memberships (
  course_id uuid not null references public.courses(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  primary key(course_id, student_id)
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  title text not null,
  description text not null default '',
  due_at timestamptz not null,
  max_marks numeric(7,2) not null default 100 check (max_marks >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  submission_url text,
  answer_text text,
  submitted_at timestamptz not null default now(),
  marks numeric(7,2) check (marks >= 0),
  feedback text not null default '',
  graded_by uuid references public.profiles(id) on delete set null,
  graded_at timestamptz,
  unique(assignment_id, student_id)
);

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  marked_by uuid not null references public.profiles(id) on delete restrict,
  class_date date not null default current_date,
  status public.attendance_status not null,
  created_at timestamptz not null default now(),
  unique(course_id, student_id, class_date)
);

create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  duration_minutes integer not null default 30 check (duration_minutes between 5 and 600),
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.student_checkins (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  energy integer not null check (energy between 1 and 5),
  focus integer not null check (focus between 1 and 10),
  confidence integer not null check (confidence between 1 and 10),
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_memberships_student on public.course_memberships(student_id);
create index if not exists idx_assignments_course_due on public.assignments(course_id, due_at);
create index if not exists idx_submissions_student on public.submissions(student_id);
create index if not exists idx_attendance_student_date on public.attendance_records(student_id, class_date desc);
create index if not exists idx_checkins_student_date on public.student_checkins(student_id, created_at desc);

-- Create a profile automatically after Supabase Auth creates a user.
create or replace function public.handle_new_learnix_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare role_value public.learnix_role;
begin
  role_value := case when (new.raw_user_meta_data ->> 'role') in ('student','teacher')
    then (new.raw_user_meta_data ->> 'role')::public.learnix_role else 'student'::public.learnix_role end;
  insert into public.profiles (id, full_name, email, role, semester, department)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name',''), coalesce(new.email,''), role_value,
          nullif(new.raw_user_meta_data ->> 'semester',''), nullif(new.raw_user_meta_data ->> 'department',''))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created_learnix on auth.users;
create trigger on_auth_user_created_learnix after insert on auth.users
for each row execute procedure public.handle_new_learnix_user();

create or replace function public.learnix_is_teacher_of(target_course uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.courses c where c.id = target_course and c.teacher_id = auth.uid())
$$;
create or replace function public.learnix_is_enrolled(target_course uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.course_memberships m where m.course_id = target_course and m.student_id = auth.uid())
$$;
create or replace function public.learnix_is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
$$;

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.course_memberships enable row level security;
alter table public.assignments enable row level security;
alter table public.submissions enable row level security;
alter table public.attendance_records enable row level security;
alter table public.study_sessions enable row level security;
alter table public.student_checkins enable row level security;

-- Profiles: users can read/update their own profile; teachers/admins have scoped read access.
create policy "profiles_select_self_or_authorized" on public.profiles for select to authenticated
using (id = auth.uid() or public.learnix_is_admin() or (role = 'student' and exists (
  select 1 from public.course_memberships mine join public.courses c on c.id = mine.course_id
  where mine.student_id = profiles.id and c.teacher_id = auth.uid()
)));
create policy "profiles_update_self" on public.profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()));

create policy "courses_read_member_or_teacher" on public.courses for select to authenticated
using (teacher_id = auth.uid() or public.learnix_is_enrolled(id) or public.learnix_is_admin());
create policy "teachers_create_courses" on public.courses for insert to authenticated
with check (teacher_id = auth.uid() and exists(select 1 from public.profiles p where p.id = auth.uid() and p.role in ('teacher','admin')));
create policy "teachers_update_own_courses" on public.courses for update to authenticated
using (teacher_id = auth.uid() or public.learnix_is_admin()) with check (teacher_id = auth.uid() or public.learnix_is_admin());

create policy "memberships_read_self_or_teacher" on public.course_memberships for select to authenticated
using (student_id = auth.uid() or public.learnix_is_teacher_of(course_id) or public.learnix_is_admin());
create policy "teacher_or_admin_manage_memberships" on public.course_memberships for all to authenticated
using (public.learnix_is_teacher_of(course_id) or public.learnix_is_admin())
with check (public.learnix_is_teacher_of(course_id) or public.learnix_is_admin());

create policy "assignments_read_course_members" on public.assignments for select to authenticated
using (public.learnix_is_enrolled(course_id) or public.learnix_is_teacher_of(course_id) or public.learnix_is_admin());
create policy "teachers_create_assignments" on public.assignments for insert to authenticated
with check (created_by = auth.uid() and (public.learnix_is_teacher_of(course_id) or public.learnix_is_admin()));
create policy "teachers_update_assignments" on public.assignments for update to authenticated
using (public.learnix_is_teacher_of(course_id) or public.learnix_is_admin())
with check (public.learnix_is_teacher_of(course_id) or public.learnix_is_admin());
create policy "teachers_delete_assignments" on public.assignments for delete to authenticated
using (public.learnix_is_teacher_of(course_id) or public.learnix_is_admin());

create policy "submissions_student_or_course_teacher_read" on public.submissions for select to authenticated
using (student_id = auth.uid() or exists(select 1 from public.assignments a where a.id = assignment_id and public.learnix_is_teacher_of(a.course_id)) or public.learnix_is_admin());
create policy "students_submit_own_work" on public.submissions for insert to authenticated
with check (student_id = auth.uid() and exists(select 1 from public.assignments a where a.id = assignment_id and public.learnix_is_enrolled(a.course_id)));
create policy "students_update_own_ungraded_submission" on public.submissions for update to authenticated
using (student_id = auth.uid() and marks is null) with check (student_id = auth.uid());
create policy "teachers_grade_submissions" on public.submissions for update to authenticated
using (exists(select 1 from public.assignments a where a.id = assignment_id and public.learnix_is_teacher_of(a.course_id)) or public.learnix_is_admin())
with check (exists(select 1 from public.assignments a where a.id = assignment_id and public.learnix_is_teacher_of(a.course_id)) or public.learnix_is_admin());

create policy "attendance_student_or_teacher_read" on public.attendance_records for select to authenticated
using (student_id = auth.uid() or public.learnix_is_teacher_of(course_id) or public.learnix_is_admin());
create policy "teachers_manage_attendance" on public.attendance_records for all to authenticated
using (marked_by = auth.uid() and (public.learnix_is_teacher_of(course_id) or public.learnix_is_admin()))
with check (marked_by = auth.uid() and (public.learnix_is_teacher_of(course_id) or public.learnix_is_admin()));

create policy "students_manage_own_study_sessions" on public.study_sessions for all to authenticated
using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy "students_manage_own_checkins" on public.student_checkins for all to authenticated
using (student_id = auth.uid()) with check (student_id = auth.uid());

-- Keep sensitive database functions out of public API roles unless needed.
revoke all on function public.learnix_is_teacher_of(uuid) from public;
revoke all on function public.learnix_is_enrolled(uuid) from public;
revoke all on function public.learnix_is_admin() from public;
grant execute on function public.learnix_is_teacher_of(uuid) to authenticated;
grant execute on function public.learnix_is_enrolled(uuid) to authenticated;
grant execute on function public.learnix_is_admin() to authenticated;

-- Allow a course owner to enrol a student by institutional email without exposing the full directory.
create or replace function public.learnix_enroll_student(target_course uuid, student_email text)
returns void language plpgsql security definer set search_path = '' as $$
declare student_profile_id uuid;
begin
  if not exists (select 1 from public.courses c where c.id = target_course and c.teacher_id = auth.uid()) then
    raise exception 'You can only enrol students in your own courses.';
  end if;
  select p.id into student_profile_id from public.profiles p
    where lower(p.email) = lower(trim(student_email)) and p.role = 'student' limit 1;
  if student_profile_id is null then raise exception 'No student account found for that email.'; end if;
  insert into public.course_memberships(course_id, student_id) values (target_course, student_profile_id)
    on conflict (course_id, student_id) do nothing;
end;
$$;
revoke all on function public.learnix_enroll_student(uuid, text) from public;
grant execute on function public.learnix_enroll_student(uuid, text) to authenticated;
