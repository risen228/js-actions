import { ActionStatus } from '../enums'
import { ValidActionName } from '../types'
import { topologySortRTL } from './topology-sort'
import { EdgeType } from './types'

const to = <GraphNode extends ValidActionName>(node: GraphNode) => ({
  to: node,
  meta: { type: EdgeType.AllIn, status: ActionStatus.Ok },
})

describe('core', () => {
  describe('topologySortRTL', () => {
    test('basic', () => {
      const sortedNodes = topologySortRTL([1, 2, 3, 4, 5, 6, 7, 8], {
        1: [to(2), to(3)],
        2: [to(3), to(7)],
        3: [to(4), to(5)],
        4: [],
        5: [to(6)],
        6: [],
        7: [to(6)],
        8: [to(7)],
      })

      const order = (
        nodeA: typeof sortedNodes[number],
        nodeB: typeof sortedNodes[number]
      ) => {
        expect(sortedNodes.indexOf(nodeA)).toBeLessThan(
          sortedNodes.indexOf(nodeB)
        )
      }

      // exact result depends on initial nodes positions
      // so the best way to test sort is to compare indexes between linked nodes
      order(2, 1)
      order(3, 1)
      order(3, 2)
      order(7, 2)
      order(4, 3)
      order(5, 3)
      order(6, 5)
      order(6, 7)
      order(7, 8)
    })
  })
})
