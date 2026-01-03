import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'

export const Route = createFileRoute('/api/auth')({
  server: {
    handlers: {
      GET: ({ request }) => {
        const url = new URL(request.url)
        const params = Object.fromEntries(url.searchParams.entries())
        return json({
          params,
        })
      },
    },
  },
})
