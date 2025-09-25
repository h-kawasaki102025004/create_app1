-- Create user_preferences table for storing user settings and preferences
CREATE TABLE user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Notification preferences
    enable_expiry_alerts BOOLEAN DEFAULT TRUE,
    expiry_alert_days INTEGER DEFAULT 3 CHECK (expiry_alert_days >= 0 AND expiry_alert_days <= 30),
    enable_recipe_suggestions BOOLEAN DEFAULT TRUE,
    enable_shopping_reminders BOOLEAN DEFAULT TRUE,
    enable_email_notifications BOOLEAN DEFAULT TRUE,
    enable_push_notifications BOOLEAN DEFAULT FALSE,
    notification_time TIME DEFAULT '09:00:00',

    -- Display preferences
    theme VARCHAR(10) DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
    language VARCHAR(10) DEFAULT 'ja' CHECK (language IN ('ja', 'en')),
    currency VARCHAR(3) DEFAULT 'JPY',
    date_format VARCHAR(20) DEFAULT 'YYYY-MM-DD',

    -- Food management preferences
    default_storage_location VARCHAR(50) DEFAULT '冷蔵庫',
    auto_add_to_shopping_list BOOLEAN DEFAULT FALSE,
    smart_expiry_calculation BOOLEAN DEFAULT TRUE,

    -- Recipe preferences
    dietary_restrictions TEXT[],
    preferred_cuisine TEXT[],
    max_cooking_time INTEGER DEFAULT 60 CHECK (max_cooking_time > 0),
    skill_level VARCHAR(10) DEFAULT 'medium' CHECK (skill_level IN ('beginner', 'medium', 'advanced')),

    -- Privacy preferences
    data_sharing BOOLEAN DEFAULT FALSE,
    analytics BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id)
);

-- Create trigger for updated_at
CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create index
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- Function to create default preferences for new users
CREATE OR REPLACE FUNCTION create_default_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_preferences (user_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically create preferences for new users
CREATE TRIGGER create_user_preferences_trigger
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_user_preferences();