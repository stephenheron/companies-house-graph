import { useCallback, useMemo, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from '@xyflow/react'
import dagre from '@dagrejs/dagre'
import '@xyflow/react/dist/style.css'

import { OfficerNode } from './officer-node'
import { CompanyNode } from './company-node'
import { getOfficerAppointments, getCompanyOfficers } from '@/lib/companies-house'
import type { Appointment } from '@/lib/companies-house'

const nodeTypes = {
  officer: OfficerNode,
  company: CompanyNode,
}

const NODE_WIDTH = 220
const NODE_HEIGHT = 60

function layoutNodes(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', nodesep: 80, ranksep: 120 })

  nodes.forEach((n) => g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT }))
  edges.forEach((e) => g.setEdge(e.source, e.target))
  dagre.layout(g)

  return nodes.map((n) => {
    const pos = g.node(n.id)
    return {
      ...n,
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
    }
  })
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
        label: apt.officer_role.replaceAll('-', ' '),
      })
    }
  }

  return { nodes: layoutNodes(nodes, edges), edges }
}

export function RelationshipGraph({ officerId, officerName, appointments }: RelationshipGraphProps) {
  const initial = useMemo(
    () => buildInitialGraph(officerId, officerName, appointments),
    [officerId, officerName, appointments],
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges)
  const [expandedSet] = useState(() => new Set([`officer:${officerId}`]))

  const expandNode = useCallback(
    async (nodeId: string, nodeType: string) => {
      if (expandedSet.has(nodeId)) return
      expandedSet.add(nodeId)

      // Set loading
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
              label: apt.officer_role.replaceAll('-', ' '),
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
              label: officer.officer_role.replaceAll('-', ' '),
            })
          }
        }

        setNodes((prev) => {
          setEdges((prevEdges) => {
            const existingEdgeIds = new Set(prevEdges.map((e) => e.id))
            const dedupedEdges = newEdges.filter((e) => !existingEdgeIds.has(e.id))
            const allEdges = [...prevEdges, ...dedupedEdges]

            // We need to layout with the final node list too
            const existingNodeIds = new Set(prev.map((n) => n.id))
            const dedupedNodes = newNodes.filter((n) => !existingNodeIds.has(n.id))
            const updatedNodes = prev.map((n) =>
              n.id === nodeId ? { ...n, data: { ...n.data, loading: false, expanded: true } } : n,
            )
            const allNodes = [...updatedNodes, ...dedupedNodes]

            const laid = layoutNodes(allNodes, allEdges)
            // setNodes expects us to return from the callback, but we're inside setEdges
            // We'll use a workaround: set nodes after edges
            setTimeout(() => setNodes(laid), 0)

            return allEdges
          })

          // Return prev unchanged; the real update happens in the setTimeout above
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
      expandNode(node.id, node.type ?? '')
    },
    [expandNode],
  )

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={handleNodeClick}
      nodeTypes={nodeTypes}
      fitView
      proOptions={{ hideAttribution: true }}
    >
      <Background />
      <Controls />
    </ReactFlow>
  )
}
