import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function run() {
  const { data, error } = await supabase.from('workspace_members').select('*, workspace:workspaces(*)').eq('user_id', '01236885-496e-4780-a1ac-1c6e6c06da6c')
  console.log(JSON.stringify(data, null, 2))
}
run()
