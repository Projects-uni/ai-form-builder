import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data: e, error: eErr } = await supabase.from('embeddings').select('*').limit(1);
  if (eErr) {
    console.error("Embeddings Select Error:", eErr);
  } else {
    console.log("Embeddings table exists, row count checked previously");
  }
}
run();
