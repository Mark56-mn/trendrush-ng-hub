-- Rename whatsapp_link to whatsapp_phone and remove bank_webhook_url
ALTER TABLE site_settings
DROP COLUMN IF EXISTS whatsapp_link;

ALTER TABLE site_settings
DROP COLUMN IF EXISTS bank_webhook_url;

ALTER TABLE site_settings
ADD COLUMN whatsapp_phone VARCHAR(20) NULL;

-- Add comment for clarity
COMMENT ON COLUMN site_settings.whatsapp_phone IS 'WhatsApp phone number (without + or spaces, e.g., 2348012345678)';
