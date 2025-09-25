
-- Create categories table
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    icon VARCHAR(50),
    color VARCHAR(7),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default categories
INSERT INTO categories (name, icon, color) VALUES
('果物', '🍎', '#FF6B6B'),
('野菜', '🥕', '#4ECDC4'),
('肉類', '🥩', '#45B7D1'),
('乳製品', '🥛', '#96CEB4'),
('穀物', '🌾', '#FECA57');
