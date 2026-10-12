CREATE TABLE IF NOT EXISTS restaurants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS menu_items (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL REFERENCES restaurants(id),
    name TEXT NOT NULL,
    price_minor_units BIGINT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    available BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO restaurants (id, name) VALUES
    ('rest-1', 'Golden Dragon'),
    ('rest-2', 'Pasta Express')
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_items (id, restaurant_id, name, price_minor_units, currency, available) VALUES
    ('item-1', 'rest-1', 'Kung Pao Chicken', 1299, 'USD', true),
    ('item-2', 'rest-1', 'Spring Rolls', 599, 'USD', true),
    ('item-3', 'rest-1', 'Fried Rice', 899, 'USD', false),
    ('item-4', 'rest-2', 'Spaghetti Carbonara', 1499, 'USD', true),
    ('item-5', 'rest-2', 'Garlic Bread', 499, 'USD', true)
ON CONFLICT (id) DO NOTHING;