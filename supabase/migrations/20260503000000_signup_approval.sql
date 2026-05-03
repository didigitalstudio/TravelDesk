-- TravelDesk · signup approval gate
-- Agrega columna aprobado a agencies y operators. Los existentes quedan como aprobados.

ALTER TABLE public.agencies ADD COLUMN IF NOT EXISTS aprobado BOOLEAN NOT NULL DEFAULT false;
UPDATE public.agencies SET aprobado = true WHERE aprobado = false;

ALTER TABLE public.operators ADD COLUMN IF NOT EXISTS aprobado BOOLEAN NOT NULL DEFAULT false;
UPDATE public.operators SET aprobado = true WHERE aprobado = false;
