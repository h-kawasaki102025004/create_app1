-- Create storage_tips table
CREATE TABLE storage_tips (
    id SERIAL PRIMARY KEY,
    food_name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    storage_method VARCHAR(50) NOT NULL,
    optimal_temp VARCHAR(50),
    humidity_level VARCHAR(50),
    shelf_life_days INTEGER NOT NULL CHECK (shelf_life_days > 0),
    tips TEXT[] NOT NULL,
    source VARCHAR(50) DEFAULT 'system',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trigger for updated_at
CREATE TRIGGER update_storage_tips_updated_at
    BEFORE UPDATE ON storage_tips
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX idx_storage_tips_food_name ON storage_tips(food_name);
CREATE INDEX idx_storage_tips_category ON storage_tips(category);
CREATE INDEX idx_storage_tips_storage_method ON storage_tips(storage_method);
CREATE INDEX idx_storage_tips_food_name_trgm ON storage_tips USING gin (food_name gin_trgm_ops);

-- Insert default storage tips
INSERT INTO storage_tips (food_name, category, storage_method, optimal_temp, humidity_level, shelf_life_days, tips) VALUES
-- 野菜類
('トマト', '野菜', '常温', '15-20°C', '85-90%', 7, ARRAY['直射日光を避ける', 'ヘタを下にして保存', '熟したら冷蔵庫へ']),
('きゅうり', '野菜', '冷蔵庫', '10-13°C', '90-95%', 7, ARRAY['ビニール袋に入れて冷蔵', '水分を拭き取ってから保存', '立てて保存すると長持ち']),
('キャベツ', '野菜', '冷蔵庫', '0-5°C', '90-95%', 14, ARRAY['芯を取り除く', 'ビニール袋に入れて冷蔵', '外側から使う']),
('にんじん', '野菜', '冷蔵庫', '0-5°C', '90-95%', 21, ARRAY['ビニール袋に入れて冷蔵', '立てて保存', '葉は切り落とす']),
('たまねぎ', '野菜', '常温', '15-20°C', '65-70%', 30, ARRAY['風通しの良い場所', 'ネットに入れて吊るす', '湿気を避ける']),
('じゃがいも', '野菜', '常温', '7-10°C', '85-90%', 30, ARRAY['暗い場所で保存', 'りんごと一緒に保存すると芽が出にくい', '緑色になったら食べない']),

-- 果物類
('りんご', '果物', '冷蔵庫', '0-4°C', '85-90%', 30, ARRAY['ビニール袋に入れて冷蔵', '他の果物を熟させる効果がある', '傷があるものは早めに消費']),
('バナナ', '果物', '常温', '13-15°C', '85-90%', 7, ARRAY['房から外して保存', '13度以下では低温障害', '熟したら冷蔵庫へ']),
('みかん', '果物', '常温', '5-10°C', '85-90%', 14, ARRAY['風通しの良い場所', 'カビが生えたものは即座に除去', '下のものから食べる']),

-- 肉類
('牛肉', '肉類', '冷蔵庫', '0-4°C', '', 3, ARRAY['購入日当日～翌日までに消費', 'ドリップを拭き取る', '冷凍なら1ヶ月保存可能']),
('豚肉', '肉類', '冷蔵庫', '0-4°C', '', 2, ARRAY['購入日当日に消費推奨', 'ドリップを拭き取る', '冷凍なら3週間保存可能']),
('鶏肉', '肉類', '冷蔵庫', '0-4°C', '', 1, ARRAY['購入日当日に消費', 'ドリップを拭き取る', '冷凍なら2週間保存可能']),

-- 魚類
('魚', '魚類', '冷蔵庫', '0-4°C', '', 1, ARRAY['購入日当日に消費', '氷の上で保存', '内臓は早めに取り除く']),

-- 乳製品
('牛乳', '乳製品', '冷蔵庫', '4°C以下', '', 5, ARRAY['開封後は3日以内に消費', 'ドアポケットではなく奥で保存', '温度変化を避ける']),
('ヨーグルト', '乳製品', '冷蔵庫', '4°C以下', '', 7, ARRAY['開封後は早めに消費', '清潔なスプーンを使用', '密封して保存']),
('チーズ', '乳製品', '冷蔵庫', '4°C以下', '', 14, ARRAY['ラップで密封', '種類によって保存期間が異なる', 'カビが生えたら廃棄']),

-- 穀物類
('米', '穀物', '常温', '15°C以下', '70%以下', 365, ARRAY['密閉容器で保存', '虫害を防ぐ', '冷蔵庫保存も可能']),
('パン', '穀物', '常温', '常温', '', 3, ARRAY['直射日光を避ける', '冷凍保存可能', '電子レンジで解凍']),

-- 冷凍食品
('冷凍食品', '冷凍食品', '冷凍庫', '-18°C以下', '', 90, ARRAY['解凍・再冷凍を避ける', '密封して保存', '表示されている期限を守る']);