-- Create audit_logs table for tracking important user actions
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Create partitioning function for audit logs (by month)
CREATE OR REPLACE FUNCTION create_audit_logs_partition(start_date DATE)
RETURNS VOID AS $$
DECLARE
    table_name TEXT;
    end_date DATE;
BEGIN
    table_name := 'audit_logs_' || to_char(start_date, 'YYYY_MM');
    end_date := start_date + INTERVAL '1 month';

    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I (
            CHECK (created_at >= %L AND created_at < %L)
        ) INHERITS (audit_logs)',
        table_name, start_date, end_date
    );

    EXECUTE format('
        CREATE INDEX IF NOT EXISTS %I ON %I (user_id)',
        table_name || '_user_id_idx', table_name
    );

    EXECUTE format('
        CREATE INDEX IF NOT EXISTS %I ON %I (created_at)',
        table_name || '_created_at_idx', table_name
    );
END;
$$ LANGUAGE plpgsql;

-- Create function to automatically create partitions
CREATE OR REPLACE FUNCTION create_monthly_partition()
RETURNS TRIGGER AS $$
DECLARE
    partition_date DATE;
BEGIN
    partition_date := date_trunc('month', NEW.created_at)::DATE;
    PERFORM create_audit_logs_partition(partition_date);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic partition creation
CREATE TRIGGER create_audit_logs_partition_trigger
    BEFORE INSERT ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION create_monthly_partition();

-- Create initial partition for current month
SELECT create_audit_logs_partition(date_trunc('month', CURRENT_DATE)::DATE);

-- Function to log user actions
CREATE OR REPLACE FUNCTION log_user_action(
    p_user_id INTEGER,
    p_action VARCHAR(50),
    p_entity_type VARCHAR(50),
    p_entity_id INTEGER DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO audit_logs (
        user_id, action, entity_type, entity_id,
        old_values, new_values, ip_address, user_agent
    )
    VALUES (
        p_user_id, p_action, p_entity_type, p_entity_id,
        p_old_values, p_new_values, p_ip_address, p_user_agent
    );
END;
$$ LANGUAGE plpgsql;