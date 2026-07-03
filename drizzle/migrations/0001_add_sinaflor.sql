-- Adiciona SINAFLOR ao enum sistema (descoberto no import da planilha real)
ALTER TYPE "public"."sistema" ADD VALUE IF NOT EXISTS 'SINAFLOR';
