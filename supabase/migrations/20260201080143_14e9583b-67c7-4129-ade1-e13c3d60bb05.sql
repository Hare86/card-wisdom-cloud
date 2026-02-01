-- Add unique constraint for upsert operations on card_benefits
ALTER TABLE public.card_benefits 
ADD CONSTRAINT card_benefits_bank_card_title_unique 
UNIQUE (bank_name, card_name, benefit_title);