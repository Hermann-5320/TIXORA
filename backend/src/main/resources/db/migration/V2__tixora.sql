-- Tixora : types de billets, moderation, j'aime, geolocalisation, photos, comptes bloquables.

-- Les "categories" de billets deviennent des types de billets (les categories d'evenements arrivent sur event).
alter table category rename to ticket_type;

alter table users add column status varchar(20) not null default 'ACTIVE';
alter table users add column created_at timestamp(6) with time zone not null default now();

-- Les evenements deja publies restent visibles (APPROVED) ; les nouveaux passent par la validation admin.
alter table event add column city varchar(255);
alter table event add column category varchar(30) not null default 'CULTURE';
alter table event add column ends_at timestamp(6);
alter table event add column latitude double precision;
alter table event add column longitude double precision;
alter table event add column status varchar(20) not null default 'APPROVED';
alter table event add column rejection_reason varchar(500);
alter table event add column has_image boolean not null default false;
alter table event add column image_updated_at timestamp(6) with time zone;
alter table event add column created_at timestamp(6) with time zone not null default now();

create table event_like (
  id uuid not null primary key,
  user_id uuid not null,
  event_id uuid not null,
  created_at timestamp(6) with time zone not null default now(),
  constraint uk_event_like unique (user_id, event_id)
);

create table event_image (
  event_id uuid not null primary key,
  content_type varchar(255) not null,
  data bytea not null,
  updated_at timestamp(6) with time zone not null default now()
);

create index idx_event_status_start on event (status, starts_at);
create index idx_event_organizer on event (organizer_id);
create index idx_event_like_event on event_like (event_id);
create index idx_ticket_event on ticket (event_id);
create index idx_ticket_owner on ticket (owner_id);
create index idx_users_role on users (role);
