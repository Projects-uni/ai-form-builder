import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function run() {
  const { data: form } = await supabase.from('forms').select('schema').eq('id', 'f69dfa84-66d5-4f78-ac2c-2179dc70f2bf').single()
  console.log('Schema type:', typeof form.schema)
  console.log('Schema:', JSON.stringify(form.schema, null, 2))
}
run()
