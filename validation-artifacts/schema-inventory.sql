SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('tenant_users','tenants','users','teams','opportunities','sales','clients','subscriptions','webhook_events','document_registry')
ORDER BY table_name, ordinal_position;

SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('tenant_users','tenants','users','teams','opportunities','sales','clients','subscriptions','webhook_events','document_registry')
ORDER BY tablename, indexname;

SELECT tc.table_name, tc.constraint_name, tc.constraint_type, kcu.column_name, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('tenant_users','tenants','users','teams','opportunities','sales','clients','subscriptions','webhook_events','document_registry')
ORDER BY tc.table_name, tc.constraint_name, kcu.ordinal_position;

SELECT migration_id, timestamp, name FROM migrations ORDER BY id;
