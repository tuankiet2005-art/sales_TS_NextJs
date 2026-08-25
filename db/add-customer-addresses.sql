-- Split customer address into permanent (thường trú) and temporary (tạm trú). Safe to re-run.

ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS permanent_street_line VARCHAR(240),
    ADD COLUMN IF NOT EXISTS permanent_location_id BIGINT REFERENCES locations (id),
    ADD COLUMN IF NOT EXISTS permanent_district_id BIGINT REFERENCES location_districts (id),
    ADD COLUMN IF NOT EXISTS temporary_street_line VARCHAR(240),
    ADD COLUMN IF NOT EXISTS temporary_location_id BIGINT REFERENCES locations (id),
    ADD COLUMN IF NOT EXISTS temporary_district_id BIGINT REFERENCES location_districts (id);

UPDATE customers
SET
    permanent_street_line = COALESCE(permanent_street_line, street_line),
    permanent_location_id = COALESCE(permanent_location_id, location_id),
    permanent_district_id = COALESCE(permanent_district_id, district_id)
WHERE street_line IS NOT NULL
   OR location_id IS NOT NULL
   OR district_id IS NOT NULL;
