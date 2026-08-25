-- One sellable row per brand + model line + trim name + model year.
-- Safe on existing Neon: fails only if duplicates exist (resolve those first).

CREATE UNIQUE INDEX IF NOT EXISTS vehicles_brand_model_name_year_uidx
    ON vehicles (brand_id, model, name, model_year);
