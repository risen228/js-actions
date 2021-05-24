import { ActionName } from '../types'
import { ActionStatus, WorkflowStatus } from '../enums'

export enum EdgeType {
  AllIn = 'AllIn',
  AnyOf = 'AnyOf',
}

interface EdgeMeta<Status> {
  type: EdgeType
  status: Status
}

interface EdgeIn<GraphNode extends ActionName> {
  from: GraphNode
  meta: EdgeMeta<ActionStatus>
}

export type EdgesIn<GraphNode extends ActionName> = Record<
  GraphNode,
  EdgeIn<GraphNode>[]
>

interface EdgeOut<GraphNode extends ActionName> {
  to: GraphNode
  meta: EdgeMeta<ActionStatus>
}

export type EdgesOut<GraphNode extends ActionName> = Record<
  GraphNode,
  EdgeOut<GraphNode>[]
>

export interface DependencyGraph<GraphNode extends ActionName> {
  nodes: GraphNode[]
  edgesIn: EdgesIn<GraphNode>
  edgesOut: EdgesOut<GraphNode>
  nodesDependsOnWorkflow: Set<GraphNode>
  workflowStatusesByNode: Map<GraphNode, WorkflowStatus>
  nodesOutWorkflow: Set<GraphNode>
}
