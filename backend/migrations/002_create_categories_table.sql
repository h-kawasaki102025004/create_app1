-- Create categories table
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    icon VARCHAR(50),
    color VARCHAR(7),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trigger for updated_at
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create index
CREATE INDEX idx_categories_name ON categories(name);

-- Insert default categories
INSERT INTO categories (name, icon, color, description) VALUES
('野菜', '🥬', '#4CAF50', '新鮮な野菜類'),
('果物', '🍎', '#FF9800', '新鮮な果物類'),
('肉類', '🥩', '#F44336', '肉・鶏肉・豚肉など'),
('魚類', '🐟', '#2196F3', '魚・海鮮類'),
('乳製品', '🥛', '#9C27B0', '牛乳・チーズ・ヨーグルトなど'),
('穀物', '🌾', '#795548', '米・パン・麺類など'),
('調味料', '🧂', '#607D8B', '調味料・スパイス類'),
('冷凍食品', '🧊', '#00BCD4', '冷凍保存の食品'),
('缶詰・保存食品', '🥫', '#FF5722', '缶詰・レトルト食品など'),
('飲み物', '🥤', '#3F51B5', '飲料・アルコール類'),
('お菓子・デザート', '🍰', '#E91E63', 'お菓子・スイーツ類'),
('その他', '📦', '#9E9E9E', 'その他の食品');