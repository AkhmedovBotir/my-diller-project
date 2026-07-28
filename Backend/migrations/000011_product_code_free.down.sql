-- Eski formatni qaytarish (mavjud erkin kodlar bilan conflict bo'lishi mumkin)
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_code_format_chk;
ALTER TABLE products ADD CONSTRAINT products_code_format_chk CHECK (
    code ~ '^[A-Z0-9]{3}-[A-Z0-9]{3}$'
);
