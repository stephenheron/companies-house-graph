import { useCallback, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { LayoutGrid } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OfficerNode } from './officer-node'
import { CompanyNode } from './company-node'
import { DetailSheet, type SelectedNode } from './detail-sheet'
import { layoutGraph, layoutNewNodes } from './graph-layout'
import {
  getOfficerAppointments,
  getCompanyOfficers,
  getCompanyProfile,
  getCompanyFilingHistory,
} from '@/lib/companies-house'
import type { Appointment } from '@/lib/companies-house'

const nodeTypes = {
  officer: OfficerNode,
  company: CompanyNode,
}

interface RelationshipGraphProps {
  officerId: string
  officerName: string
  appointments: Appointment[]
}

function buildInitialGraph(
  officerId: string,
  officerName: string,
  appointments: Appointment[],
) {
  const nodes: Node[] = [
    {
      id: `officer:${officerId}`,
      type: 'officer',
      position: { x: 0, y: 0 },
      data: { label: officerName, expanded: true, loading: false },
    },
  ]

  const edges: Edge[] = []

  for (const apt of appointments) {
    const companyId = `company:${apt.appointed_to.company_number}`

    if (!nodes.some((n) => n.id === companyId)) {
      nodes.push({
        id: companyId,
        type: 'company',
        position: { x: 0, y: 0 },
        data: {
          label: apt.appointed_to.company_name ?? apt.appointed_to.company_number,
          expanded: false,
          loading: false,
          status: apt.appointed_to.company_status,
        },
      })
    }

    const edgeId = `officer:${officerId}->${companyId}`
    if (!edges.some((e) => e.id === edgeId)) {
      edges.push({
        id: edgeId,
        source: `officer:${officerId}`,
        target: companyId,
      })
    }
  }

  return layoutGraph(nodes, edges)
}

export function RelationshipGraph({ officerId, officerName, appointments }: RelationshipGraphProps) {
  const initial = useMemo(
    () => buildInitialGraph(officerId, officerName, appointments),
    [officerId, officerName, appointments],
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges)
  const [expandedSet] = useState(() => new Set([`officer:${officerId}`]))
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const clickTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const expandNode = useCallback(
    async (nodeId: string, nodeType: string) => {
      if (expandedSet.has(nodeId)) return
      expandedSet.add(nodeId)

      setNodes((prev) =>
        prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, loading: true } } : n)),
      )

      try {
        const newNodes: Node[] = []
        const newEdges: Edge[] = []

        if (nodeType === 'officer') {
          const id = nodeId.replace('officer:', '')
          const data = await getOfficerAppointments({ data: id })

          for (const apt of data.items) {
            const companyId = `company:${apt.appointed_to.company_number}`

            newNodes.push({
              id: companyId,
              type: 'company',
              position: { x: 0, y: 0 },
              data: {
                label: apt.appointed_to.company_name ?? apt.appointed_to.company_number,
                expanded: false,
                loading: false,
                status: apt.appointed_to.company_status,
              },
            })

            newEdges.push({
              id: `${nodeId}->${companyId}`,
              source: nodeId,
              target: companyId,
            })
          }
        } else if (nodeType === 'company') {
          const companyNumber = nodeId.replace('company:', '')
          const data = await getCompanyOfficers({ data: companyNumber })

          for (const officer of data.items) {
            const officerPath = officer.links.officer.appointments
            const extractedId = officerPath.split('/')[2]
            const officerNodeId = `officer:${extractedId}`

            newNodes.push({
              id: officerNodeId,
              type: 'officer',
              position: { x: 0, y: 0 },
              data: {
                label: officer.name,
                expanded: false,
                loading: false,
              },
            })

            newEdges.push({
              id: `${officerNodeId}->${nodeId}`,
              source: officerNodeId,
              target: nodeId,
            })
          }
        }

        setNodes((prev) => {
          setEdges((prevEdges) => {
            const existingEdgeIds = new Set(prevEdges.map((e) => e.id))
            const dedupedEdges = newEdges.filter((e) => !existingEdgeIds.has(e.id))
            const allEdges = [...prevEdges, ...dedupedEdges]

            const existingNodeIds = new Set(prev.map((n) => n.id))
            const dedupedNodes = newNodes.filter((n) => !existingNodeIds.has(n.id))
            const updatedNodes = prev.map((n) =>
              n.id === nodeId ? { ...n, data: { ...n.data, loading: false, expanded: true } } : n,
            )

            const laid = layoutNewNodes(updatedNodes, dedupedNodes, allEdges, nodeId)
            setTimeout(() => {
              setNodes(laid.nodes)
              setEdges(laid.edges)
            }, 0)

            return prevEdges
          })

          return prev
        })
      } catch {
        setNodes((prev) =>
          prev.map((n) =>
            n.id === nodeId ? { ...n, data: { ...n.data, loading: false } } : n,
          ),
        )
        expandedSet.delete(nodeId)
      }
    },
    [expandedSet, setNodes, setEdges],
  )

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (clickTimeout.current) clearTimeout(clickTimeout.current)
      clickTimeout.current = setTimeout(async () => {
        try {
          if (node.type === 'company') {
            const companyNumber = node.id.replace('company:', '')
            const [profile, filingHistory] = await Promise.all([
              getCompanyProfile({ data: companyNumber }),
              getCompanyFilingHistory({ data: companyNumber }),
            ])
            setSelectedNode({ type: 'company', data: profile, filings: filingHistory.items ?? [] })
          } else if (node.type === 'officer') {
            const id = node.id.replace('officer:', '')
            const details = await getOfficerAppointments({ data: id })
            setSelectedNode({ type: 'officer', data: details })
          }
          setSheetOpen(true)
        } catch {
          // silently fail
        }
      }, 250)
    },
    [],
  )

  const handleNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (clickTimeout.current) clearTimeout(clickTimeout.current)
      expandNode(node.id, node.type ?? '')
    },
    [expandNode],
  )

  const handleReorganize = useCallback(() => {
    const result = layoutGraph(nodes, edges)
    setNodes(result.nodes)
    setEdges(result.edges)
  }, [nodes, edges, setNodes, setEdges])

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        nodeTypes={nodeTypes}
        fitView
        colorMode="dark"
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls />
        <div className="absolute right-4 top-4 z-10">
          <Button variant="secondary" size="sm" onClick={handleReorganize}>
            <LayoutGrid className="mr-2 h-4 w-4" />
            Reorganize
          </Button>
        </div>
      </ReactFlow>

      <DetailSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        selectedNode={selectedNode}
      />
    </>
  )
}
