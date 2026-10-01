-- Schema d origine, tel que genere par Hibernate avant l'arrivee de Flyway.
-- Sur une base deja existante, Flyway saute cette etape (baseline) et applique directement V2.
create table users (
  id uuid not null primary key,
  first_name varchar(255),
  last_name varchar(255),
  email varchar(255) not null,
  password_hash varchar(255),
  role varchar(255),
  phone varchar(255),
  organization varchar(255),
  event_id uuid,
  organizer_id uuid,
  constraint uk_users_email unique (email)
);

create table event (
  id uuid not null primary key,
  title varchar(255),
  venue varchar(255),
  description varchar(2000),
  starts_at timestamp(6),
  organizer_id uuid
);

create table category (
  id uuid not null primary key,
  name varchar(255),
  price integer not null,
  capacity integer not null,
  sold integer not null,
  event_id uuid not null,
  constraint fk_category_event foreign key (event_id) references event (id)
);

create table ticket (
  id uuid not null primary key,
  code varchar(255) not null,
  event_id uuid,
  event_title varchar(255),
  venue varchar(255),
  starts_at timestamp(6),
  category_name varchar(255),
  price integer not null,
  owner_id uuid,
  status varchar(255),
  constraint uk_ticket_code unique (code)
);
