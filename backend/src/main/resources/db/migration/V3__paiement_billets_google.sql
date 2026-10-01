-- Paiement CT Pay (commandes), personnalisation des billets, logo organisateur.

create table purchase_order (
  id uuid not null primary key,
  buyer_id uuid not null,
  event_id uuid not null,
  status varchar(255) not null,
  operator_key varchar(255),
  phone varchar(255),
  subtotal integer not null,
  fees integer not null,
  total integer not null,
  transaction_id varchar(255),
  process_code varchar(255),
  failure_reason varchar(300),
  created_at timestamp(6) with time zone not null default now(),
  expires_at timestamp(6) with time zone,
  paid_at timestamp(6) with time zone,
  last_checked_at timestamp(6) with time zone,
  constraint uk_order_transaction unique (transaction_id)
);

create table purchase_order_line (
  order_id uuid not null references purchase_order (id) on delete cascade,
  ticket_type_id uuid,
  name varchar(255),
  price integer not null,
  quantity integer not null
);

alter table ticket add column order_id uuid;

alter table event add column ticket_template varchar(255) not null default 'CLASSIC';
alter table event add column ticket_color varchar(255) not null default '#f24e12';
alter table event add column ticket_message varchar(140);

alter table users add column has_logo boolean not null default false;
alter table users add column logo_updated_at timestamp(6) with time zone;

create table organizer_logo (
  user_id uuid not null primary key,
  content_type varchar(255) not null,
  data bytea not null,
  updated_at timestamp(6) with time zone not null default now()
);

create index idx_order_buyer on purchase_order (buyer_id);
create index idx_order_status_expiry on purchase_order (status, expires_at);
create index idx_order_process on purchase_order (process_code);
create index idx_ticket_order on ticket (order_id);
