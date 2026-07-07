-- Perfil do servidor: formação, data de nascimento (avatar_url já existia em 0000)
ALTER TABLE "servidores" ADD COLUMN IF NOT EXISTS "formacao" text;
ALTER TABLE "servidores" ADD COLUMN IF NOT EXISTS "data_nascimento" date;
