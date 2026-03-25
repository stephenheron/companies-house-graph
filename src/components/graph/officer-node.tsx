import { Handle, Position } from '@xyflow/react'
import { User, Loader2 } from 'lucide-react'
import type { NodeProps } from '@xyflow/react'

interface OfficerNodeData {
  label: string
  expanded: boolean
  loading: boolean
  [key: string]: unknown
}

export function OfficerNode({ data }: NodeProps & { data: OfficerNodeData }) {
  return (
    <div
      className={`flex min-w-[180px] items-center gap-3 rounded-lg border bg-card p-3 shadow-md transition-colors ${
        data.expanded ? 'border-primary' : 'border-border cursor-pointer hover:border-primary/50'
      }`}
    >
      <Handle type="source" position={Position.Top} id="top" className="!bg-primary" isConnectable={false} />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-primary" isConnectable={false} />
      <Handle type="source" position={Position.Left} id="left" className="!bg-primary" isConnectable={false} />
      <Handle type="source" position={Position.Right} id="right" className="!bg-primary" isConnectable={false} />
      <Handle type="target" position={Position.Top} id="t-top" className="!bg-primary" isConnectable={false} />
      <Handle type="target" position={Position.Bottom} id="t-bottom" className="!bg-primary" isConnectable={false} />
      <Handle type="target" position={Position.Left} id="t-left" className="!bg-primary" isConnectable={false} />
      <Handle type="target" position={Position.Right} id="t-right" className="!bg-primary" isConnectable={false} />
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
        {data.loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : (
          <User className="h-4 w-4 text-primary" />
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-card-foreground">{data.label}</p>
        <p className="text-xs text-muted-foreground">Officer</p>
      </div>
    </div>
  )
}
