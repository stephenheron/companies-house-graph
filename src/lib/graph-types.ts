export type GraphNodeType = 'officer' | 'company'

export interface GraphNode {
  id: string
  type: GraphNodeType
  label: string
  expanded: boolean
  loading: boolean
  meta?: Record<string, string>
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  label?: string
}
