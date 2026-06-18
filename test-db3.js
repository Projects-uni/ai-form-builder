import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data: resp } = await supabase.from('responses').select('id, form_id, answers');
  if (!resp || resp.length === 0) return console.log("No responses");
  
  const formId = resp[0].form_id;
  const { data: form } = await supabase.from('forms').select('schema').eq('id', formId).single();
  
  console.log("Form Schema Questions:", JSON.stringify(form?.schema?.questions, null, 2));
  console.log("Sample Answers:", JSON.stringify(resp[0].answers, null, 2));
}
run();
