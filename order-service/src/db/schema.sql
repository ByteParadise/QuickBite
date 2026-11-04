CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL,
    restaurant_name TEXT NOT NULL,
    total_minor_units BIGINT NOT NULL,
    currency TEXT NOT NULL,
    account_sub TEXT,
    card_id TEXT NOT NULL,
    line1 TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id),
    item_id TEXT NOT NULL,
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    -- price of one unit of this item, stored in minor units
    -- e.g. 492 for $4.92 item, not 4.92
    unit_price_minor_units BIGINT NOT NULL,
    -- unit_price_minor_units * quantity 
    subtotal_minor_units BIGINT NOT NULL
);