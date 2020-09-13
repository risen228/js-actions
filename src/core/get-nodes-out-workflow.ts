import { ValidActionName } from '../types'
import { dfs } from './dfs'
import { EdgesOut } from './types'

interface State<GraphNode> {
  nodesOutWorkflow: Set<GraphNode>
  isOutWorkflow: boolean
  upperNodeOutWorkflow: GraphNode | null
}

export function getNodesOutWorkflow<GraphNode extends ValidActionName>(
  // requires RTL-sorted nodes (parents should be at the end of the stack)
  nodes: GraphNode[],
  edgesOut: EdgesOut<GraphNode>,
  nodesDependsOnWorkflow: Set<GraphNode>
) {
  return dfs({
    nodes,
    edgesOut,
    state: {
      nodesOutWorkflow: new Set(),
      isOutWorkflow: false,
      upperNodeOutWorkflow: null,
    } as State<GraphNode>,
    onEnterNode: ({ node, state }) => {
      if (!state.isOutWorkflow && nodesDependsOnWorkflow.has(node)) {
        state.isOutWorkflow = true
        state.upperNodeOutWorkflow = node
      }

      if (state.isOutWorkflow) {
        state.nodesOutWorkflow.add(node)
      }
    },
    onLeaveNode: ({ node, state }) => {
      if (node === state.upperNodeOutWorkflow) {
        state.isOutWorkflow = false
        state.upperNodeOutWorkflow = null
      }
    },
    getResult: (state) => state.nodesOutWorkflow,
  })
}
