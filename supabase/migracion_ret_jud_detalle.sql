-- RET. JUD. (Alcalde): columna ret_jud_detalle para el cálculo automático.
-- Idempotente; aplicar sobre una base de datos ya existente con datos.
--
-- ret_jud pasa de ser un monto editable a un total calculado en el cliente:
-- cada retención judicial aplica un % (hasta 10, guardados en
-- ret_jud_detalle) sobre (Total Ingreso − (Fdo. Pens. + P. Seg. + C. Var. +
-- IR 5ta Cat.)). abrir_periodo ya copia esta columna automáticamente al
-- generar el mes siguiente (usa information_schema, no una lista fija de
-- columnas), así que no requiere ningún cambio adicional.
ALTER TABLE public.alcalde ADD COLUMN IF NOT EXISTS ret_jud_detalle JSONB;
