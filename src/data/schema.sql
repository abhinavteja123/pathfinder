-- Target Postgres/Supabase schema. Not executed by the app yet -- Phase 0
-- develops against InMemoryRepository; wire this in when a real Supabase
-- project is provisioned (see PATHFINDER_SYSTEM_DESIGN.md §4).

create table students (
  id text primary key,
  year smallint not null check (year between 1 and 4),
  program text not null check (program in ('BTech', 'BBA')),
  created_at timestamptz not null default now()
);

create table onboarding_state (
  student_id text primary key references students(id),
  stage text not null check (stage in ('not_started', 'in_progress', 'complete')),
  started_at timestamptz,
  completed_at timestamptz
);

-- append-only: preserves how an answer evolved over time, never overwritten
create table profile_answers (
  id bigserial primary key,
  student_id text not null references students(id),
  key text not null,
  value text not null,
  captured_at timestamptz not null default now()
);
create index profile_answers_student_idx on profile_answers(student_id, key);

create table conversation_log (
  id bigserial primary key,
  student_id text not null references students(id),
  turn integer not null,
  role text not null check (role in ('bot', 'student')),
  text text not null,
  node_id text not null,
  created_at timestamptz not null default now()
);
create index conversation_log_student_idx on conversation_log(student_id, created_at);

create table roadmap_items (
  id bigserial primary key,
  student_id text not null references students(id),
  item_id text not null,
  category text not null check (category in ('milestone', 'hackathon', 'internship', 'oss')),
  title text not null,
  description text not null,
  link text,
  "order" integer not null default 0,
  status text not null check (status in ('suggested', 'saved', 'started', 'done')),
  created_at timestamptz not null default now(),
  unique (student_id, item_id)
);
create index roadmap_items_student_idx on roadmap_items(student_id);

create table checkins (
  student_id text primary key references students(id),
  last_checkin_at timestamptz,
  next_due_at timestamptz
);
