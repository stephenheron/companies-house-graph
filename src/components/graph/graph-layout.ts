import type { Node, Edge } from '@xyflow/react'
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from 'd3-force'

const NODE_WIDTH = 220
const NODE_HEIGHT = 60

interface SimNode extends SimulationNodeDatum {
  id: string
}

const HANDLE_POSITIONS = [
  { id: 'top', x: NODE_WIDTH / 2, y: 0 },
  { id: 'bottom', x: NODE_WIDTH / 2, y: NODE_HEIGHT },
  { id: 'left', x: 0, y: NODE_HEIGHT / 2 },
  { id: 'right', x: NODE_WIDTH, y: NODE_HEIGHT / 2 },
]

function getClosestHandles(
  sourcePos: { x: number; y: number },
  targetPos: { x: number; y: number },
) {
  let bestSource = 'bottom'
  let bestTarget = 't-top'
  let bestDist = Infinity

  for (const s of HANDLE_POSITIONS) {
    for (const t of HANDLE_POSITIONS) {
      const dist = Math.hypot(
        sourcePos.x + s.x - (targetPos.x + t.x),
        sourcePos.y + s.y - (targetPos.y + t.y),
      )
      if (dist < bestDist) {
        bestDist = dist
        bestSource = s.id
        bestTarget = 't-' + t.id
      }
    }
  }

  return { sourceHandle: bestSource, targetHandle: bestTarget }
}

function runSimulation(simNodes: SimNode[], simLinks: SimulationLinkDatum<SimNode>[]) {
  const simulation = forceSimulation(simNodes)
    .force(
      'link',
      forceLink<SimNode, SimulationLinkDatum<SimNode>>(simLinks)
        .id((d) => d.id)
        .distance(300),
    )
    .force('charge', forceManyBody().strength(-800))
    .force('center', forceCenter(0, 0))
    .force('collide', forceCollide(160))
    .stop()

  for (let i = 0; i < 200; i++) simulation.tick()

  return new Map(simNodes.map((n) => [n.id, { x: n.x ?? 0, y: n.y ?? 0 }]))
}

export function resolveEdgeHandles(nodes: Node[], edges: Edge[]): Edge[] {
  const posMap = new Map(nodes.map((n) => [n.id, n.position]))

  return edges.map((e) => {
    const sPos = posMap.get(e.source) ?? { x: 0, y: 0 }
    const tPos = posMap.get(e.target) ?? { x: 0, y: 0 }
    const { sourceHandle, targetHandle } = getClosestHandles(sPos, tPos)
    return { ...e, sourceHandle, targetHandle }
  })
}

export function layoutGraph(nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[] } {
  if (nodes.length === 0) return { nodes, edges }

  const simNodes: SimNode[] = nodes.map((n) => ({ id: n.id }))
  const simLinks: SimulationLinkDatum<SimNode>[] = edges.map((e) => ({
    source: e.source,
    target: e.target,
  }))

  const posMap = runSimulation(simNodes, simLinks)

  const laidNodes = nodes.map((n) => ({
    ...n,
    position: posMap.get(n.id) ?? { x: 0, y: 0 },
  }))

  return { nodes: laidNodes, edges: resolveEdgeHandles(laidNodes, edges) }
}

export function layoutNewNodes(
  existingNodes: Node[],
  newNodes: Node[],
  allEdges: Edge[],
  anchorId: string,
): { nodes: Node[]; edges: Edge[] } {
  if (newNodes.length === 0) {
    return { nodes: existingNodes, edges: resolveEdgeHandles(existingNodes, allEdges) }
  }

  const anchor = existingNodes.find((n) => n.id === anchorId)
  const anchorPos = anchor?.position ?? { x: 0, y: 0 }

  const SPREAD_RADIUS = 400
  const allNodes = [...existingNodes, ...newNodes]
  const existingIds = new Set(existingNodes.map((n) => n.id))

  let newIndex = 0
  const newCount = newNodes.length
  const simNodes: SimNode[] = allNodes.map((n) => {
    if (existingIds.has(n.id)) {
      return {
        id: n.id,
        x: n.position.x,
        y: n.position.y,
        fx: n.position.x,
        fy: n.position.y,
      }
    }
    const angle = (2 * Math.PI * newIndex) / newCount - Math.PI / 2
    newIndex++
    return {
      id: n.id,
      x: anchorPos.x + Math.cos(angle) * SPREAD_RADIUS,
      y: anchorPos.y + Math.sin(angle) * SPREAD_RADIUS,
    }
  })

  const simLinks: SimulationLinkDatum<SimNode>[] = allEdges.map((e) => ({
    source: e.source,
    target: e.target,
  }))

  const simulation = forceSimulation(simNodes)
    .force(
      'link',
      forceLink<SimNode, SimulationLinkDatum<SimNode>>(simLinks)
        .id((d) => d.id)
        .distance(300),
    )
    .force('charge', forceManyBody().strength(-800))
    .force('collide', forceCollide(160))
    .stop()

  for (let i = 0; i < 200; i++) simulation.tick()

  const posMap = new Map(simNodes.map((n) => [n.id, { x: n.x ?? 0, y: n.y ?? 0 }]))

  const laidNodes = allNodes.map((n) => ({
    ...n,
    position: existingIds.has(n.id) ? n.position : (posMap.get(n.id) ?? { x: 0, y: 0 }),
  }))

  return { nodes: laidNodes, edges: resolveEdgeHandles(laidNodes, allEdges) }
}
