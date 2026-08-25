-- Soft-delete flag for customers (safe to re-run).

ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_customers_active ON customers (is_active) WHERE is_active = TRUE;
