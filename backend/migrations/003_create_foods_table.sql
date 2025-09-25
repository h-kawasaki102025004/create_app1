-- Create foods table
CREATE TABLE foods (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    purchase_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    quantity DECIMAL(10,2) NOT NULL CHECK (quantity > 0),
    unit VARCHAR(20) NOT NULL,
    storage_location VARCHAR(50),
    barcode VARCHAR(50),
    image_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'consumed', 'expired', 'disposed')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trigger for updated_at
CREATE TRIGGER update_foods_updated_at
    BEFORE UPDATE ON foods
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_foods_user_id ON foods(user_id);
CREATE INDEX idx_foods_category_id ON foods(category_id);
CREATE INDEX idx_foods_expiry_date ON foods(expiry_date);
CREATE INDEX idx_foods_purchase_date ON foods(purchase_date);
CREATE INDEX idx_foods_status ON foods(status);
CREATE INDEX idx_foods_storage_location ON foods(storage_location);
CREATE INDEX idx_foods_barcode ON foods(barcode);
CREATE INDEX idx_foods_name_trgm ON foods USING gin (name gin_trgm_ops);

-- Create compound indexes for common queries
CREATE INDEX idx_foods_user_status ON foods(user_id, status);
CREATE INDEX idx_foods_user_expiry ON foods(user_id, expiry_date);
CREATE INDEX idx_foods_user_category ON foods(user_id, category_id);

-- Create function to check if food is expiring soon
CREATE OR REPLACE FUNCTION is_food_expiring_soon(expiry_date DATE, days_threshold INTEGER DEFAULT 3)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN expiry_date <= CURRENT_DATE + INTERVAL '1 day' * days_threshold
           AND expiry_date >= CURRENT_DATE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to check if food is expired
CREATE OR REPLACE FUNCTION is_food_expired(expiry_date DATE)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN expiry_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;