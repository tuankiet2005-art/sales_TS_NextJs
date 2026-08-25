-- Mark one consulting employee as the quote-page default (safe to re-run).

ALTER TABLE consulting_employees
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE consulting_employees
SET is_default = TRUE
WHERE id = (
  SELECT id
  FROM consulting_employees
  ORDER BY sort_order, name
  LIMIT 1
)
AND NOT EXISTS (SELECT 1 FROM consulting_employees WHERE is_default = TRUE);
