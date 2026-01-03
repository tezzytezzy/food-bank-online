-- Convert required_user_fields from Array to Object (Map)
-- This assumes existing data is an JSON array of objects: [{ "label": "X", "type": "Y" }, ...]
-- We want to convert to: { "x": { "label": "X", "data_type": "Y" } }

-- We use a PL/pgSQL block to migrate data if needed, but for simplicity in this artifact we can try a direct update using jsonb_object_agg if possible, or just note that this changes the "expectation" of the column.
-- Since Supabase/Postgres JSONB doesn't strictly enforce schema, we can just start writing Objects to it.
-- BUT existing code reading it might break.
-- Given I am "modifying... existing codebase", I should ideally migrate data.
-- However, complex JSONB migration in SQL can be tricky without functions.

-- Let's define the column comment to reflect the new structure.
COMMENT ON COLUMN public.templates.required_user_fields IS 'Map of field_key -> { label, data_type, abbreviation }';

-- If we want to strictly migrate, we would need a function.
-- For this "Mission", I will assume we can just treat it as the new format going forward, 
-- OR strictly speaking, if I am "implementing", I should probably update the application code that WRITES this first?
-- The user asked for "Task 2... Propose...". Now Approved.
-- I'll create an idempotent migration that attempts to transform if it's an array.

DO $$
DECLARE
    r RECORD;
    new_json JSONB;
    elem JSONB;
    field_key TEXT;
    field_label TEXT;
    field_type TEXT;
BEGIN
    FOR r IN SELECT id, required_user_fields FROM public.templates WHERE jsonb_typeof(required_user_fields) = 'array' LOOP
        new_json := '{}'::jsonb;
        
        -- Iterate over the array elements
        FOR elem IN SELECT * FROM jsonb_array_elements(r.required_user_fields) LOOP
            field_label := elem ->> 'label';
            -- Normalize label to key (lowercase, underscore)
            field_key := lower(regexp_replace(field_label, '\s+', '_', 'g'));
            field_type := elem ->> 'type';
            
            -- Construct new object entry
            new_json := jsonb_set(new_json, ARRAY[field_key], jsonb_build_object(
                'label', field_label,
                'data_type', field_type
            ));
        END LOOP;
        
        -- Update the row
        UPDATE public.templates SET required_user_fields = new_json WHERE id = r.id;
    END LOOP;
END $$;
