-- Color photos now support multiple images per color in vehicles.color_photos JSON:
--   legacy: {"Trắng": "123"}
--   current: {"Trắng": ["123", "456"], "Đen": ["789"]}
-- Safe to re-run. No schema change required — only documents the JSON shape.

COMMENT ON COLUMN vehicles.color_photos IS 'JSON map of color label to ordered vehicle_images id list';
