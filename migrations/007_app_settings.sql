-- Migration 007: app_settings table for global maintenance mode
-- Run manually in Supabase SQL Editor before deploying the admin panel frontend.

CREATE TABLE app_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  is_maintenance boolean NOT NULL DEFAULT false,
  maintenance_message text DEFAULT 'Estamos haciendo mejoras. Volvemos en unos minutos.',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES nutris(id)
);

INSERT INTO app_settings (id) VALUES (1);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario autenticado puede leer (para chequear si está en mantenimiento)
CREATE POLICY "authenticated_read" ON app_settings
  FOR SELECT TO authenticated USING (true);

-- Solo admins pueden actualizar
CREATE POLICY "admin_update" ON app_settings
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM nutris WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM nutris WHERE id = auth.uid() AND role = 'admin'));

-- RPC para exponer last_sign_in_at de auth.users solo a admins
-- (auth.users no es accesible directamente desde el cliente)
CREATE OR REPLACE FUNCTION get_nutris_with_last_sign_in()
RETURNS TABLE (id uuid, last_sign_in_at timestamptz)
SECURITY DEFINER LANGUAGE sql AS $$
  SELECT u.id, u.last_sign_in_at
  FROM auth.users u
  INNER JOIN nutris n ON n.id = u.id AND n.role != 'admin'
  WHERE EXISTS (
    SELECT 1 FROM nutris adm
    WHERE adm.id = auth.uid() AND adm.role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION get_nutris_with_last_sign_in() FROM public;
GRANT EXECUTE ON FUNCTION get_nutris_with_last_sign_in() TO authenticated;
