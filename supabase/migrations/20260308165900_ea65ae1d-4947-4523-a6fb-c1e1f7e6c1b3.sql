ALTER TABLE public.scratch_prizes 
  ADD COLUMN selection_mode text NOT NULL DEFAULT 'sequential' CHECK (selection_mode IN ('sequential', 'probability')),
  ADD COLUMN probability_weight numeric NOT NULL DEFAULT 0;