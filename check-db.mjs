import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function run() {
  const { data: forms } = await supabase.from('forms').select('id, title')
  console.log('Forms:', forms)

  if (forms && forms.length > 0) {
    const { data: responses } = await supabase.from('responses').select('id, form_id, answers')
    console.log('Responses count:', responses?.length)
    if (responses?.length) {
      console.log('Sample answer:', responses[0].answers)
    }

    const { data: embeddings } = await supabase.from('embeddings').select('id, form_id, question_key')
    console.log('Embeddings count:', embeddings?.length)
    
    // Test the analyze endpoint payload
    if (responses?.length) {
        console.log('Testing payload for first response:', { responseId: responses[0].id, formId: responses[0].form_id })
    }
  }
}
run()
