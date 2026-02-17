import Anthropic from '@anthropic-ai/sdk'
import * as dotenv from 'dotenv'

dotenv.config()

async function testAnthropicAPI() {
  const apiKey = process.env.ANTHROPIC_API_KEY

  console.log('🔑 Key:       ', apiKey?.slice(0, 20) + '...')
  console.log('📡 Enviando requisição...\n')

  const client = new Anthropic({ apiKey })
  const start = Date.now()

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 64,
    messages: [{ role: 'user', content: 'Responda só: API funcionando!' }],
  })

  console.log('✅ Status:    OK')
  console.log('⏱  Latência:  ' + (Date.now() - start) + 'ms')
  console.log('🤖 Modelo:    ' + msg.model)
  const block = msg.content[0]
  console.log('💬 Resposta:  ' + ('text' in block ? block.text : JSON.stringify(block)))
  console.log('📊 Tokens:    input=' + msg.usage.input_tokens + ' output=' + msg.usage.output_tokens)
  console.log('🛑 Stop:      ' + msg.stop_reason)
}

testAnthropicAPI().catch((err) => {
  console.error('❌ Erro:', err.message)
  process.exit(1)
})
