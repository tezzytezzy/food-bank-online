-- Migration to convert 'yes_no' data types to 'boolean' in required_user_fields
-- This iterates over all templates and updates the 'data_type' in the JSONB object map.

DO $$
DECLARE
    r RECORD;
    new_json JSONB;
    key TEXT;
    value JSONB;
    data_type TEXT;
BEGIN
    FOR r IN SELECT id, required_user_fields FROM public.templates LOOP
        IF r.required_user_fields IS NOT NULL AND jsonb_typeof(r.required_user_fields) = 'object' THEN
            new_json := r.required_user_fields;
            
            -- Iterate over keys in the object map
            FOR key IN SELECT jsonb_object_keys(r.required_user_fields) LOOP
                value := r.required_user_fields -> key;
                data_type := value ->> 'data_type';
                
                -- Check for 'yes_no' and update to 'boolean'
                IF data_type = 'yes_no' THEN
                    new_json := jsonb_set(
                        new_json, 
                        ARRAY[key, 'data_type'], 
                        '"boolean"'
                    );
                END IF;
            END LOOP;
            
            -- Only update if changed
            IF new_json != r.required_user_fields THEN
                UPDATE public.templates SET required_user_fields = new_json WHERE id = r.id;
            END IF;
        END IF;
    END LOOP;
END $$;
