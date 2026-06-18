-- Run this in your Supabase SQL Editor to enforce the 1-response rule securely

CREATE UNIQUE INDEX IF NOT EXISTS one_response_per_email 
ON public.responses (form_id, (respondent_meta->>'email')) 
WHERE respondent_meta->>'email' IS NOT NULL;
