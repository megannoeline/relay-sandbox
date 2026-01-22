CREATE TABLE IF NOT EXISTS characters (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  power_level INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO characters (name, power_level) VALUES 
  ('Bun Man', 9000),
  ('Postgres Knight', 5000);
