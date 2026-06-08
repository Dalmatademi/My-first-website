-- Create countries table
CREATE TABLE IF NOT EXISTS countries (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name_en TEXT NOT NULL,
  name_sq TEXT NOT NULL,
  flag_code TEXT NOT NULL,
  image_url TEXT,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  country_slug TEXT REFERENCES countries(slug) ON DELETE CASCADE,
  author_name TEXT DEFAULT 'Anonymous',
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  country_slug TEXT REFERENCES countries(slug) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(country_slug, visitor_id)
);

-- Enable RLS
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Public read access for countries
DROP POLICY IF EXISTS "Countries are public" ON countries;
CREATE POLICY "Countries are public" ON countries
  FOR SELECT USING (true);

-- Public read/insert for reviews
DROP POLICY IF EXISTS "Reviews are public read" ON reviews;
CREATE POLICY "Reviews are public read" ON reviews
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can add reviews" ON reviews;
CREATE POLICY "Anyone can add reviews" ON reviews
  FOR INSERT WITH CHECK (true);

-- Public read/insert/delete for favorites
DROP POLICY IF EXISTS "Favorites are public read" ON favorites;
CREATE POLICY "Favorites are public read" ON favorites
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can add favorites" ON favorites;
CREATE POLICY "Anyone can add favorites" ON favorites
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can delete their own favorites" ON favorites;
CREATE POLICY "Anyone can delete their own favorites" ON favorites
  FOR DELETE USING (true);

-- Seed countries
INSERT INTO countries (slug, name_en, name_sq, flag_code, category) VALUES
  ('italy', 'Italy', 'Italia', 'it', 'overall'),
  ('thailand', 'Thailand', 'Tailanda', 'th', 'cheapest'),
  ('vietnam', 'Vietnam', 'Vietnam', 'vn', 'cheapest'),
  ('indonesia', 'Indonesia', 'Indonezia', 'id', 'cheapest'),
  ('japan', 'Japan', 'Japonia', 'jp', 'exciting'),
  ('brazil', 'Brazil', 'Brazili', 'br', 'exciting'),
  ('uae', 'UAE', 'Emiratet e Bashkuara', 'ae', 'exciting'),
  ('maldives', 'Maldives', 'Maldivet', 'mv', 'relaxing'),
  ('greece', 'Greece', 'Greqia', 'gr', 'relaxing'),
  ('bali', 'Bali, Indonesia', 'Bali, Indonezi', 'id', 'relaxing'),
  ('japan-culture', 'Japan', 'Japonia', 'jp', 'culture'),
  ('egypt', 'Egypt', 'Egjipti', 'eg', 'culture'),
  ('india', 'India', 'India', 'in', 'culture'),
  ('italy-food', 'Italy', 'Italia', 'it', 'food'),
  ('mexico', 'Mexico', 'Meksika', 'mx', 'food'),
  ('turkey', 'Turkey', 'Turqia', 'tr', 'food'),
  ('new-zealand', 'New Zealand', 'Zelanda e Re', 'nz', 'nature'),
  ('norway', 'Norway', 'Norvegjia', 'no', 'nature'),
  ('costa-rica', 'Costa Rica', 'Kosta Rika', 'cr', 'nature'),
  ('nepal', 'Nepal', 'Nepali', 'np', 'adventure'),
  ('new-zealand-adv', 'New Zealand', 'Zelanda e Re', 'nz', 'adventure'),
  ('peru', 'Peru', 'Peruja', 'pe', 'adventure')
ON CONFLICT (slug) DO NOTHING;

-- Sample reviews
INSERT INTO reviews (country_slug, author_name, rating, comment_text) VALUES
  ('italy', 'Alex', 5, 'Absolutely breathtaking! The food, the history, the people — Italy has it all.'),
  ('japan', 'Maria', 5, 'Tokyo is unlike anywhere else on Earth. A must-visit!'),
  ('thailand', 'Sam', 4, 'Incredible value for money. Street food is amazing!'),
  ('maldives', 'Elena', 5, 'Pure paradise. The overwater villas are a dream.'),
  ('mexico', 'Carlos', 5, 'Best tacos I have ever had. The culture is so vibrant!')
ON CONFLICT DO NOTHING;
