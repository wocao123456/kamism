-- patch18: messages type add 'email'
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_type_check;
ALTER TABLE messages ADD CONSTRAINT messages_type_check CHECK (type::text = ANY (ARRAY['notice'::text, 'message'::text, 'email'::text]));
