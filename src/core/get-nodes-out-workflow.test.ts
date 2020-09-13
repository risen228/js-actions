import { ActionStatus } from '../enums'
import { ValidActionName } from '../types'
import { EdgeType } from './types'
import { getNodesOutWorkflow } from './get-nodes-out-workflow'
import { topologySortRTL } from './topology-sort'

const to = <GraphNode extends ValidActionName>(node: GraphNode) => ({
  to: node,
  meta: { type: EdgeType.AllIn, status: ActionStatus.Ok },
})

describe('core', () => {
  describe('getNodesOutWorkflow', () => {
    test('basic', () => {
      const edgesOut = {
        0: [to(1)],
        1: [to(2), to(3)],
        2: [to(3), to(7)],
        3: [to(4)],
        4: [],
        5: [to(6)],
        6: [],
        7: [to(6)],
        8: [to(7)],
      }

      const nodesOutWorkflow = getNodesOutWorkflow(
        topologySortRTL([0, 1, 2, 3, 4, 5, 6, 7, 8], edgesOut),
        edgesOut,
        new Set([1])
      )

      expect(Array.from(nodesOutWorkflow)).toEqualNoOrder([1, 2, 3, 7, 6, 4])
    })
  })
})
