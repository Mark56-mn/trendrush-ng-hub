-- Add bank webhook URL column to site_settings
ALTER TABLE public.site_settings ADD COLUMN bank_webhook_url TEXT;

-- Update the updated_at trigger
UPDATE public.site_settings SET updated_at = NOW();
