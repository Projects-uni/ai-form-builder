import Groq from 'groq-sdk'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

async function test() {
  console.log('Testing Groq...')
  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: 'test' }],
      model: 'llama-3.3-70b-versatile',
      max_tokens: 10,
    })
    console.log('Groq success:', chatCompletion.choices[0]?.message?.content)
  } catch (err) {
    console.error('Groq error:', err)
  }

  console.log('Testing OpenAI...')
  try {
    const embeddingRes = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: 'test',
      dimensions: 1536,
    })
    console.log('OpenAI success, dimension:', embeddingRes.data[0]?.embedding?.length)
  } catch (err) {
    console.error('OpenAI error:', err.message)
  }
}
test()
