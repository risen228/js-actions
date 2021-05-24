import { ActionName } from '../types'
import { dfs } from './dfs'
import { EdgesOut } from './types'

interface State<TGraphNode> {
  sortedNodes: TGraphNode[]
}

// RTL = right to left
export function topologySortRTL<TGraphNode extends ActionName>(
  nodes: TGraphNode[],
  edgesOut: EdgesOut<TGraphNode>
) {
  return dfs({
    nodes,
    edgesOut,
    state: {
      sortedNodes: [],
    } as State<TGraphNode>,
    onLeaveNode: ({ node, state }) => state.sortedNodes.push(node),
    getResult: (state) => state.sortedNodes,
  })
}
