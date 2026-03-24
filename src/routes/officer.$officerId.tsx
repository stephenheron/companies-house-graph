import { createFileRoute, Link } from '@tanstack/react-router'
import { getOfficerAppointments } from '@/lib/companies-house'
import { RelationshipGraph } from '@/components/graph/relationship-graph'

export const Route = createFileRoute('/officer/$officerId')({
  loader: ({ params }) => getOfficerAppointments({ data: params.officerId }),
  component: OfficerPage,
})

function OfficerPage() {
  const data = Route.useLoaderData()
  const { officerId } = Route.useParams()

  return (
    <main className="flex h-screen flex-col">
      <div className="flex items-center gap-4 border-b border-border px-4 py-3">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          &larr; Back to search
        </Link>
        <h1 className="text-lg font-semibold">{data.name}</h1>
      </div>
      <div className="flex-1">
        <RelationshipGraph
          officerId={officerId}
          officerName={data.name}
          appointments={data.items}
        />
      </div>
    </main>
  )
}
