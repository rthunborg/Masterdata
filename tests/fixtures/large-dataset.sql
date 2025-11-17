-- Large Dataset Seed Script for Performance Testing
-- Story: 11.8 - Performance & Concurrency Tests
-- Generates 1000 employees for performance benchmarks

-- Note: This is a template SQL file. In actual tests, you would:
-- 1. Use a database migration or seed script
-- 2. Or use test helpers to generate data programmatically
-- 3. Or use Supabase test database with this seed data

INSERT INTO employees (first_name, surname, ssn, email, mobile, rank, gender, town_district, hire_date, omc_date, created_at, updated_at)
SELECT
  'Employee' || generate_series AS first_name,
  'Test' AS surname,
  '199001' || lpad(generate_series::text, 6, '0') AS ssn,
  'employee' || generate_series || '@example.com' AS email,
  '+467012345' || lpad((generate_series % 100)::text, 2, '0') AS mobile,
  CASE WHEN generate_series % 2 = 0 THEN 'SEV' ELSE 'CHEF' END AS rank,
  CASE WHEN generate_series % 2 = 0 THEN 'Man' ELSE 'Woman' END AS gender,
  CASE 
    WHEN generate_series % 3 = 0 THEN 'Stockholm'
    WHEN generate_series % 3 = 1 THEN 'Gothenburg'
    ELSE 'Malmö'
  END AS town_district,
  '2025-01-01'::date AS hire_date,
  CASE WHEN generate_series <= 20 THEN (SELECT id FROM important_dates WHERE date_value = '2025-03-08' LIMIT 1) ELSE NULL END AS omc_date,
  NOW() AS created_at,
  NOW() AS updated_at
FROM generate_series(1, 1000);

-- Generate 50 important dates for testing
INSERT INTO important_dates (week_number, year, category, date_description, date_value, max_spots, remaining_spots, created_at, updated_at)
SELECT
  (generate_series % 52) + 1 AS week_number,
  2025 AS year,
  CASE 
    WHEN generate_series % 3 = 0 THEN 'ÖMC Dates'
    WHEN generate_series % 3 = 1 THEN 'PE3 Dates'
    ELSE 'Stena Dates'
  END AS category,
  'Test Date ' || generate_series AS date_description,
  ('2025-01-01'::date + (generate_series || ' days')::interval)::text AS date_value,
  20 AS max_spots,
  20 - (generate_series % 10) AS remaining_spots,
  NOW() AS created_at,
  NOW() AS updated_at
FROM generate_series(1, 50)
ON CONFLICT DO NOTHING;

