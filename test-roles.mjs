import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function run() {
  const { data, error } = await supabase.rpc('query', { sql: "SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'workspace_members_role_check'" })
  console.log('RPC Error?', error)
  // Let's just try to fetch the table constraints from information_schema if possible
  const { data: cols } = await supabase.from('workspace_members').select('*').limit(1)
  console.log(cols)
}
run()
