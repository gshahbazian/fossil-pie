import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: App })

function App() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-6">
      <div className="max-w-2xl w-full space-y-6">
        <h1 className="text-4xl font-semibold">Fossil Pie</h1>
        <p className="text-slate-300">
          This app is intentionally minimal. The only API endpoint is{' '}
          <code className="px-2 py-1 bg-slate-800 rounded text-slate-200">
            /api/auth
          </code>
          , which reads OAuth callback parameters.
        </p>
        <p className="text-slate-400 text-sm">
          Edit <code>src/routes/index.tsx</code> to change this page.
        </p>
      </div>
    </main>
  )
}
