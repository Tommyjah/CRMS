INSERT INTO public.departments (name, code, description, approval_order) 
VALUES ('Initiator', 'INITIATOR', 'Department authorized to initiate new network change requests', 99)
ON CONFLICT (code) DO NOTHING;