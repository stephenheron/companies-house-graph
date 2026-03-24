import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { SearchInput } from '@/components/search-input'
import { searchOfficers, type Officer } from '@/lib/companies-house'

export const Route = createFileRoute('/')({ component: App })

function App() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Officer[]>([])
  const [searched, setSearched] = useState(false)

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    try {
      const data = await searchOfficers({ data: query })
      setResults(data.items ?? [])
      setSearched(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <h1 className="mb-8 text-4xl font-bold tracking-tight">
        Companies House
      </h1>
      <SearchInput value={query} onChange={setQuery} onSearch={handleSearch} loading={loading} />

      {searched && (
        <div className="mt-8 w-full max-w-lg space-y-3">
          {results.length === 0 ? (
            <p className="text-center text-muted-foreground">No results found.</p>
          ) : (
            results.map((officer, i) => {
              const officerId = officer.links?.self?.split('/')[2]
              return (
                <Link
                  key={i}
                  to="/officer/$officerId"
                  params={{ officerId: officerId ?? '' }}
                  className="block rounded-lg border border-border bg-card p-4 no-underline transition-colors hover:bg-accent"
                >
                  <p className="font-semibold text-card-foreground">{officer.title}</p>
                  <p className="text-sm text-muted-foreground">{officer.description}</p>
                  <p className="text-sm text-muted-foreground">{officer.address_snippet}</p>
                </Link>
              )
            })
          )}
        </div>
      )}
    </main>
  )
}
