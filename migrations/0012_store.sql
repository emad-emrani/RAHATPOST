-- «المتجر»: digital products (subscriptions, codes, links), orders and payment settings.
create table if not exists store_categories (
  id text primary key,
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists store_products (
  id text primary key,
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,80}$'),
  name text not null,
  category_id text references store_categories (id) on delete set null,
  price_agorot int not null check (price_agorot >= 0),
  sale_agorot int check (sale_agorot is null or sale_agorot >= 0),
  image_key text check (image_key is null or image_key ~ '^[a-f0-9]{32}\.(webp|jpg)$'),
  short_desc text not null default '',
  description text not null default '',
  duration text not null default 'none',
  badges jsonb not null default '[]',
  stock int check (stock is null or stock >= 0),
  active boolean not null default false,
  sort int not null default 0,
  delivery text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists store_products_list_idx on store_products (active, sort, created_at desc);

create table if not exists store_orders (
  id text primary key,
  user_id text references "user" ("id") on delete set null,
  user_name text not null default '',
  user_email text not null default '',
  status text not null default 'pending' check (status in ('pending', 'paid', 'delivered', 'cancelled')),
  total_agorot int not null check (total_agorot >= 0),
  currency text not null default 'ILS',
  provider text not null default 'manual',
  provider_ref text not null default '',
  note text not null default '',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists store_orders_user_idx on store_orders (user_id, created_at desc);
create index if not exists store_orders_status_idx on store_orders (status, created_at desc);

create table if not exists store_order_items (
  order_id text not null references store_orders (id) on delete cascade,
  product_id text not null,
  name text not null,
  unit_agorot int not null,
  qty int not null check (qty between 1 and 20),
  delivery text not null default '',
  primary key (order_id, product_id)
);

-- One JSON row of store + payment settings. Provider secrets inside are AES-GCM encrypted.
create table if not exists store_settings (
  id int primary key check (id = 1),
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Every provider callback, verified or not (audit trail; never trusted on its own).
create table if not exists store_payment_events (
  id bigserial primary key,
  order_id text,
  provider text not null,
  verified boolean not null default false,
  detail text not null default '',
  created_at timestamptz not null default now()
);

-- Automatic delivery: 'fixed' = the same content for every buyer; 'codes' = one code per unit
-- from store_codes (each code assigned to at most one order).
alter table store_products add column if not exists delivery_type text not null default 'fixed'
  check (delivery_type in ('fixed', 'codes'));

create table if not exists store_codes (
  id bigserial primary key,
  product_id text not null references store_products (id) on delete cascade,
  code text not null,
  order_id text references store_orders (id) on delete set null,
  assigned_at timestamptz,
  created_at timestamptz not null default now(),
  unique (product_id, code)
);
create index if not exists store_codes_free_idx on store_codes (product_id, id) where order_id is null;

alter table store_order_items add column if not exists revoked boolean not null default false;

create table if not exists store_deliveries (
  id bigserial primary key,
  order_id text not null references store_orders (id) on delete cascade,
  action text not null check (action in ('deliver', 'resend', 'revoke', 'email', 'short')),
  detail text not null default '',
  created_at timestamptz not null default now()
);
