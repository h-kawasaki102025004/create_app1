-- Create notifications table
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    food_id INTEGER REFERENCES foods(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('expiry_alert', 'recipe_suggestion', 'shopping_reminder', 'system')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'unread' CHECK (status IN ('unread', 'read')),
    priority VARCHAR(10) DEFAULT 'low' CHECK (priority IN ('high', 'medium', 'low')),
    action_url VARCHAR(500),
    metadata JSONB,
    sent_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trigger for updated_at
CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_food_id ON notifications(food_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_priority ON notifications(priority);
CREATE INDEX idx_notifications_sent_at ON notifications(sent_at);
CREATE INDEX idx_notifications_user_status ON notifications(user_id, status);
CREATE INDEX idx_notifications_user_type ON notifications(user_id, type);

-- Create function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE notifications
    SET status = 'read', read_at = NOW()
    WHERE id = notification_id AND status = 'unread';
END;
$$ LANGUAGE plpgsql;