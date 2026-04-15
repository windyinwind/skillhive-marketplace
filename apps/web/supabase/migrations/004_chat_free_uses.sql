-- Chat free-use quota: each wallet gets 3 free Chat responses total (lifetime)
-- After that, payment is required per response.

create table if not exists chat_free_uses (
  wallet_address  text        primary key,
  uses_count      integer     not null default 0,
  first_used_at   timestamptz not null default now(),
  last_used_at    timestamptz not null default now()
);

-- Only the service role can read/write this table
alter table chat_free_uses enable row level security;

-- No public access — all reads/writes go through service role in API routes
