-- Add HTML field to mini_apps table
ALTER TABLE mini_apps
ADD COLUMN html TEXT;

-- Add comment
COMMENT ON COLUMN mini_apps.html IS 'HTML code for the mini app UI';

-- Add constraint to ensure html is not empty when provided
ALTER TABLE mini_apps
ADD CONSTRAINT valid_html CHECK (html IS NULL OR char_length(html) >= 10);
