import { Handle, Position } from '@xyflow/react'
import { Building2, Loader2 } from 'lucide-react'
import type { NodeProps } from '@xyflow/react'

interface CompanyNodeData {
  label: string
  expanded: boolean
  loading: boolean
  status?: string
  [key: string]: unknown
}

export function CompanyNode({ data }: NodeProps & { data: CompanyNodeData }) {
  return (
    <div
      className={`flex min-w-[180px] items-center gap-3 rounded-lg border bg-card p-3 shadow-md transition-colors ${
        data.expanded ? 'border-blue-500' : 'border-border cursor-pointer hover:border-blue-500/50'
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-blue-500" />
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/10">
        {data.loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
        ) : (
          <Building2 className="h-4 w-4 text-blue-500" />
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-card-foreground">{data.label}</p>
        <p className="text-xs text-muted-foreground">
          {data.status ? data.status.replaceAll('-', ' ') : 'Company'}
        </p>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-blue-500" />
    </div>
  )
}
