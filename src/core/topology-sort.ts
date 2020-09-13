import { ValidActionName } from '../types'
import { dfs } from './dfs'
import { EdgesOut } from './types'

interface State<GraphNode> {
  sortedNodes: GraphNode[]
}

// RTL = right to left
export function topologySortRTL<GraphNode extends ValidActionName>(
  nodes: GraphNode[],
  edgesOut: EdgesOut<GraphNode>
) {
  return dfs({
    nodes,
    edgesOut,
    state: {
      sortedNodes: [],
    } as State<GraphNode>,
    onLeaveNode: ({ node, state }) => state.sortedNodes.push(node),
    getResult: (state) => state.sortedNodes,
  })
}
