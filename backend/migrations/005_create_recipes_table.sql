-- Create recipes table
CREATE TABLE recipes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    instructions TEXT[] NOT NULL,
    prep_time INTEGER NOT NULL CHECK (prep_time >= 0),
    cook_time INTEGER NOT NULL CHECK (cook_time >= 0),
    servings INTEGER NOT NULL CHECK (servings > 0),
    difficulty VARCHAR(10) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    image_url VARCHAR(500),
    source VARCHAR(20) NOT NULL CHECK (source IN ('ai_generated', 'external_api', 'user_created')),
    external_id VARCHAR(100),
    external_url VARCHAR(500),
    tags TEXT[],
    nutritional_info JSONB,
    rating DECIMAL(3,2) CHECK (rating >= 0 AND rating <= 5),
    rating_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create recipe_ingredients table
CREATE TABLE recipe_ingredients (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    ingredient_name VARCHAR(100) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL CHECK (quantity > 0),
    unit VARCHAR(20) NOT NULL,
    optional BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_recipe_favorites table (many-to-many)
CREATE TABLE user_recipe_favorites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, recipe_id)
);

-- Create user_recipe_ratings table
CREATE TABLE user_recipe_ratings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, recipe_id)
);

-- Create triggers for updated_at
CREATE TRIGGER update_recipes_updated_at
    BEFORE UPDATE ON recipes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipe_ingredients_updated_at
    BEFORE UPDATE ON recipe_ingredients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_recipe_ratings_updated_at
    BEFORE UPDATE ON user_recipe_ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX idx_recipes_name ON recipes(name);
CREATE INDEX idx_recipes_difficulty ON recipes(difficulty);
CREATE INDEX idx_recipes_source ON recipes(source);
CREATE INDEX idx_recipes_prep_time ON recipes(prep_time);
CREATE INDEX idx_recipes_cook_time ON recipes(cook_time);
CREATE INDEX idx_recipes_servings ON recipes(servings);
CREATE INDEX idx_recipes_rating ON recipes(rating);
CREATE INDEX idx_recipes_external_id ON recipes(external_id);
CREATE INDEX idx_recipes_name_trgm ON recipes USING gin (name gin_trgm_ops);
CREATE INDEX idx_recipes_tags ON recipes USING gin (tags);

CREATE INDEX idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_ingredient_name ON recipe_ingredients(ingredient_name);
CREATE INDEX idx_recipe_ingredients_name_trgm ON recipe_ingredients USING gin (ingredient_name gin_trgm_ops);

CREATE INDEX idx_user_recipe_favorites_user_id ON user_recipe_favorites(user_id);
CREATE INDEX idx_user_recipe_favorites_recipe_id ON user_recipe_favorites(recipe_id);

CREATE INDEX idx_user_recipe_ratings_user_id ON user_recipe_ratings(user_id);
CREATE INDEX idx_user_recipe_ratings_recipe_id ON user_recipe_ratings(recipe_id);
CREATE INDEX idx_user_recipe_ratings_rating ON user_recipe_ratings(rating);

-- Function to update recipe rating when user rating changes
CREATE OR REPLACE FUNCTION update_recipe_rating()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE recipes
        SET
            rating = (
                SELECT AVG(rating)::DECIMAL(3,2)
                FROM user_recipe_ratings
                WHERE recipe_id = NEW.recipe_id
            ),
            rating_count = (
                SELECT COUNT(*)
                FROM user_recipe_ratings
                WHERE recipe_id = NEW.recipe_id
            )
        WHERE id = NEW.recipe_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE recipes
        SET
            rating = COALESCE((
                SELECT AVG(rating)::DECIMAL(3,2)
                FROM user_recipe_ratings
                WHERE recipe_id = OLD.recipe_id
            ), 0),
            rating_count = (
                SELECT COUNT(*)
                FROM user_recipe_ratings
                WHERE recipe_id = OLD.recipe_id
            )
        WHERE id = OLD.recipe_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for rating updates
CREATE TRIGGER update_recipe_rating_trigger
    AFTER INSERT OR UPDATE OR DELETE ON user_recipe_ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_recipe_rating();