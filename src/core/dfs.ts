import { CycleError } from '../util/errors'
import { ActionName } from '../types'
import { EdgesOut } from './types'

enum DfsStatus {
  NotChecked,
  InCheck,
  Checked,
}

function getLoopSequence<TGraphNode extends ActionName>(
  nodes: TGraphNode[],
  dfsStatuses: Map<TGraphNode, DfsStatus>
): TGraphNode[] {
  return Array.from(
    new Set(
      nodes.filter((node) => {
        return dfsStatuses.get(node) === DfsStatus.InCheck
      })
    )
  )
}

interface DfsCallbackParams<TGraphNode extends ActionName, State> {
  node: TGraphNode
  state: State
  statuses: Map<TGraphNode, DfsStatus>
}

export function dfs<TGraphNode extends ActionName, TState, TResult>({
  nodes,
  edgesOut,
  state,
  onEnterNode = () => {},
  onLeaveNode = () => {},
  getResult,
}: {
  nodes: TGraphNode[]
  edgesOut: EdgesOut<TGraphNode>
  state: TState
  onEnterNode?: (params: DfsCallbackParams<TGraphNode, TState>) => void
  onLeaveNode?: (params: DfsCallbackParams<TGraphNode, TState>) => void
  getResult: (state: TState) => TResult
}): TResult {
  const statuses: Map<TGraphNode, DfsStatus> = new Map()
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
