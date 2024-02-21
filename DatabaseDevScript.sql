create table users (
  id serial primary key,
  username text not null unique,
  password text not null
);

create table projects (
  user_id integer references users(id),
  id serial primary key,
  title text not null
);

create table docs (
  id serial primary key,
  title text not null,
  body text,
  proj_id integer references projects(id)
);