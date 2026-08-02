ALTER TABLE public.items ADD COLUMN IF NOT EXISTS on_list boolean NOT NULL DEFAULT true;
UPDATE public.items SET on_list = false WHERE favorite = true;