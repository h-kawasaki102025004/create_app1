-- Create shopping_lists table
CREATE TABLE shopping_lists (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    total_estimated_cost DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shopping_list_items table
CREATE TABLE shopping_list_items (
    id SERIAL PRIMARY KEY,
    list_id INTEGER NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
    item_name VARCHAR(100) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL CHECK (quantity > 0),
    unit VARCHAR(20) NOT NULL,
    purchased BOOLEAN DEFAULT FALSE,
    estimated_price DECIMAL(10,2),
    actual_price DECIMAL(10,2),
    store_name VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create triggers for updated_at
CREATE TRIGGER update_shopping_lists_updated_at
    BEFORE UPDATE ON shopping_lists
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shopping_list_items_updated_at
    BEFORE UPDATE ON shopping_list_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX idx_shopping_lists_user_id ON shopping_lists(user_id);
CREATE INDEX idx_shopping_lists_completed ON shopping_lists(completed);
CREATE INDEX idx_shopping_lists_user_completed ON shopping_lists(user_id, completed);

CREATE INDEX idx_shopping_list_items_list_id ON shopping_list_items(list_id);
CREATE INDEX idx_shopping_list_items_purchased ON shopping_list_items(purchased);
CREATE INDEX idx_shopping_list_items_item_name ON shopping_list_items(item_name);
CREATE INDEX idx_shopping_list_items_name_trgm ON shopping_list_items USING gin (item_name gin_trgm_ops);

-- Function to update shopping list completion status
CREATE OR REPLACE FUNCTION update_shopping_list_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the shopping list's completion status based on its items
    UPDATE shopping_lists
    SET completed = (
        SELECT CASE
            WHEN COUNT(*) = 0 THEN FALSE
            ELSE COUNT(*) = COUNT(*) FILTER (WHERE purchased = TRUE)
        END
        FROM shopping_list_items
        WHERE list_id = COALESCE(NEW.list_id, OLD.list_id)
    ),
    total_estimated_cost = COALESCE((
        SELECT SUM(estimated_price * quantity)
        FROM shopping_list_items
        WHERE list_id = COALESCE(NEW.list_id, OLD.list_id)
        AND estimated_price IS NOT NULL
    ), 0)
    WHERE id = COALESCE(NEW.list_id, OLD.list_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic completion status update
CREATE TRIGGER update_shopping_list_completion_trigger
    AFTER INSERT OR UPDATE OR DELETE ON shopping_list_items
    FOR EACH ROW
    EXECUTE FUNCTION update_shopping_list_completion();