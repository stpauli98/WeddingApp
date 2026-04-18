-- Add 'unlimited' to PricingTier enum.
-- Idempotent: DB already has this value in some environments.
ALTER TYPE "PricingTier" ADD VALUE IF NOT EXISTS 'unlimited';
