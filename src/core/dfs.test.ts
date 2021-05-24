import { ActionStatus } from '../enums'
import { ActionName } from '../types'
import { CycleError } from '../util/errors'
import { dfs } from './dfs'
import { EdgeType } from './types'

const to = <GraphNode extends ActionName>(node: GraphNode) => ({
  to: node,
  meta: { type: EdgeType.AllIn, status: ActionStatus.Ok },
})

describe('core', () => {
  describe('dfs', () => {
    test('basic', () => {
      const nodes = [5, 4, 6, 8, 1, 7, 3, 2]

      const { enterSequence, leaveSequence } = dfs({
        nodes,
        edgesOut: {
          1: [to(2), to(3)],
          2: [],
          3: [to(4), to(5)],
          4: [],
          5: [to(6)],
          6: [],
          7: [to(6)],
          8: [to(7)],
        },
        state: {
          enterSequence: [] as ActionName[],
          leaveSequence: [] as ActionName[],
        },
        onEnterNode: ({ node, state }) => state.enterSequence.push(node),
        onLeaveNode: ({ node, state }) => state.leaveSequence.push(node),
        getResult: (state) => state,
      })

      expect(enterSequence).toEqual([2, 3, 5, 6, 4, 7, 1, 8])
      expect(leaveSequence).toEqual([2, 6, 5, 4, 3, 7, 1, 8])
    })

    test('with cycle', () => {
      expect(() => {
        dfs({
          nodes: [1, 2],
          edgesOut: {
            1: [to(2)],
            2: [to(1)],
          },
          state: {},
          getResult: (state) => state,
        })
      }).toThrow(new CycleError([1, 2]))

      expect(() => {
        dfs({
          nodes: [2, 3, 1],
          edgesOut: {
            1: [to(2)],
            2: [to(3)],
            3: [to(1)],
          },
          state: {},
          getResult: (state) => state,
        })
      }).toThrow(new CycleError([2, 3, 1]))
    })
  })
})
