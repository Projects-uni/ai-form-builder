import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data: resp, error: rErr } = await supabase.from('responses').select('answers, form_id');
  console.log("Responses count:", resp?.length);
  
  const { data: emb, error: eErr } = await supabase.from('embeddings').select('id, form_id');
  console.log("Embeddings count:", emb?.length);
  
  if (eErr) console.error("Embeddings Error:", eErr);
}
run();
