import { CycleError } from '../util/errors'
import { ValidActionName } from '../types'
import { EdgesOut } from './types'

enum DfsStatus {
  NotChecked,
  InCheck,
  Checked,
}

function getLoopSequence<GraphNode extends ValidActionName>(
  nodes: GraphNode[],
  dfsStatuses: Map<GraphNode, DfsStatus>
): GraphNode[] {
  return Array.from(
    new Set(
      nodes.filter((node) => {
        return dfsStatuses.get(node) === DfsStatus.InCheck
      })
    )
  )
}

interface DfsCallbackParams<GraphNode extends ValidActionName, State> {
  node: GraphNode
  state: State
  statuses: Map<GraphNode, DfsStatus>
}

export function dfs<GraphNode extends ValidActionName, State, Result>({
  nodes,
  edgesOut,
  state,
  onEnterNode = () => {},
  onLeaveNode = () => {},
  getResult,
}: {
  nodes: GraphNode[]
  edgesOut: EdgesOut<GraphNode>
  state: State
  onEnterNode?: (params: DfsCallbackParams<GraphNode, State>) => void
  onLeaveNode?: (params: DfsCallbackParams<GraphNode, State>) => void
  getResult: (state: State) => Result
}): Result {
  const statuses: Map<GraphNode, DfsStatus> = new Map()
  for (const node of nodes) statuses.set(node, DfsStatus.NotChecked)

  const stack = [...nodes]

  while (stack.length > 0) {
    const node = stack[stack.length - 1]

    const status = statuses.get(node)

    if (status === DfsStatus.Checked) {
      stack.pop()
      continue
    }

    if (status === DfsStatus.InCheck) {
      statuses.set(node, DfsStatus.Checked)
      stack.pop()
      onLeaveNode({ node, state, statuses })
      continue
    }

    statuses.set(node, DfsStatus.InCheck)
    onEnterNode({ node, state, statuses })

    for (const edge of edgesOut[node]) {
      const { to: childNode } = edge

      const childStatus = statuses.get(childNode)

      if (childStatus === DfsStatus.InCheck)
        throw new CycleError(getLoopSequence(stack, statuses))

      stack.push(childNode)
    }
  }

  return getResult(state)
}
