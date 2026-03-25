import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/chat')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.OPENROUTER_API_KEY
        if (!apiKey) {
          return new Response(
            JSON.stringify({ error: 'OPENROUTER_API_KEY not configured' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }

        const { prompt, pdfBase64 } = await request.json()

        try {
          const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'openai/gpt-5.4-mini',
              stream: true,
              plugins: [{ id: 'file-parser', pdf: { engine: 'mistral-ocr' } }],
              messages: [
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: prompt },
                    {
                      type: 'file',
                      file: {
                        filename: 'filing.pdf',
                        file_data: `data:application/pdf;base64,${pdfBase64}`,
                      },
                    },
                  ],
                },
              ],
            }),
          })

          if (!res.ok) {
            const error = await res.text()
            return new Response(
              JSON.stringify({ error }),
              { status: res.status, headers: { 'Content-Type': 'application/json' } },
            )
          }

          return new Response(res.body, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              Connection: 'keep-alive',
            },
          })
        } catch (error) {
          return new Response(
            JSON.stringify({
              error: error instanceof Error ? error.message : 'An error occurred',
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },
    },
  },
})
