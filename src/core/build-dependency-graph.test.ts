import { Actions, ActionName } from '../types'
import { ActionStatus, WorkflowStatus } from '../enums'
import {
  buildDependencyGraph,
  createDependencyProcessor,
} from './build-dependency-graph'
import { EdgeType } from './types'

function createMap<K extends ActionName, V extends unknown>(
  object: Record<K, V>
): Map<K, V> {
  const map = new Map()

  for (const key in object) {
    map.set(key, object[key])
  }

  return map
}

function createSet<V extends ActionName>(array: V[]): Set<V> {
  return new Set(array)
}

describe('core', () => {
  describe('createDependencyProcessor', () => {
    test('AllIn', () => {
      const process = createDependencyProcessor(EdgeType.AllIn)

      const actionName = 1
      const dependencies = [{ action: 2, with: ActionStatus.Fail }, 3]
      const edgesIn = { 1: [], 2: [], 3: [] }
      const edgesOut = { 1: [], 2: [], 3: [] }

      process(actionName, dependencies, edgesIn, edgesOut)

      expect(edgesIn).toEqual({
        1: [
          {
            from: '2',
            meta: { type: EdgeType.AllIn, status: ActionStatus.Fail },
          },
          {
            from: '3',
            meta: { type: EdgeType.AllIn, status: ActionStatus.Ok },
          },
        ],
        2: [],
        3: [],
      })

      expect(edgesOut).toEqual({
        1: [],
        2: [
          {
            to: '1',
            meta: { type: EdgeType.AllIn, status: ActionStatus.Fail },
          },
        ],
        3: [
          {
            to: '1',
            meta: { type: EdgeType.AllIn, status: ActionStatus.Ok },
          },
        ],
      })
    })

    test('AnyOf', () => {
      const process = createDependencyProcessor(EdgeType.AnyOf)

      const actionName = 1
      const dependencies = [{ action: 2, with: ActionStatus.Fail }, 3]
      const edgesIn = { 1: [], 2: [], 3: [] }
      const edgesOut = { 1: [], 2: [], 3: [] }

      process(actionName, dependencies, edgesIn, edgesOut)

      expect(edgesIn).toEqual({
        1: [
          {
            from: '2',
            meta: { type: EdgeType.AnyOf, status: ActionStatus.Fail },
          },
          {
            from: '3',
            meta: { type: EdgeType.AnyOf, status: ActionStatus.Ok },
          },
        ],
        2: [],
        3: [],
      })

      expect(edgesOut).toEqual({
        1: [],
        2: [
          {
            to: '1',
            meta: { type: EdgeType.AnyOf, status: ActionStatus.Fail },
          },
        ],
        3: [
          {
            to: '1',
            meta: { type: EdgeType.AnyOf, status: ActionStatus.Ok },
          },
        ],
      })
    })
  })

  describe('buildDependencyGraph', () => {
    test('no actions', () => {
      expect(buildDependencyGraph({})).toEqual({
        nodes: [],
        edgesIn: {},
        edgesOut: {},
        nodesDependsOnWorkflow: createSet([]),
        nodesOutWorkflow: createSet([]),
        workflowStatusesByNode: createMap({}),
      })
    })

    test('basic cases', () => {
      const actions: Actions<1 | 2 | 3 | 4 | 5 | 6> = {
        1: {
          run: () => {},
        },
        2: {
          needs: [1],
          run: () => {},
        },
        3: {
          needs: [
            { action: 1, with: ActionStatus.Ok },
            { action: 2, with: ActionStatus.Fail },
          ],
          run: () => {},
        },
        4: {
          needs: [1],
          needsAnyOf: [2, { action: 3, with: ActionStatus.Fail }],
          run: () => {},
        },
        5: {
          needsWorkflow: WorkflowStatus.Fail,
          run: () => {},
        },
        6: {
          needs: [5],
          run: () => {},
        },
      }

      const graph = buildDependencyGraph(actions)

      expect(graph.nodes).toEqualNoOrder(['1', '2', '3', '4', '5', '6'])

      expect(graph.edgesIn).toEqual({
        1: [],
        2: [
          {
            from: '1',
            meta: { type: EdgeType.AllIn, status: ActionStatus.Ok },
          },
        ],
        3: [
          {
            from: '1',
            meta: { type: EdgeType.AllIn, status: ActionStatus.Ok },
          },
          {
            from: '2',
            meta: { type: EdgeType.AllIn, status: ActionStatus.Fail },
          },
        ],
        4: [
          {
            from: '1',
            meta: { type: EdgeType.AllIn, status: ActionStatus.Ok },
          },
          {
            from: '2',
            meta: { type: EdgeType.AnyOf, status: ActionStatus.Ok },
          },
          {
            from: '3',
            meta: { type: EdgeType.AnyOf, status: ActionStatus.Fail },
          },
        ],
        5: [],
        6: [
          {
            from: '5',
            meta: { type: EdgeType.AllIn, status: ActionStatus.Ok },
          },
        ],
      })

      expect(graph.edgesOut).toEqual({
        1: [
          {
            to: '2',
            meta: { type: EdgeType.AllIn, status: ActionStatus.Ok },
          },
          {
            to: '3',
            meta: { type: EdgeType.AllIn, status: ActionStatus.Ok },
          },
          {
            to: '4',
            meta: { type: EdgeType.AllIn, status: ActionStatus.Ok },
          },
        ],
        2: [
          {
            to: '3',
            meta: { type: EdgeType.AllIn, status: ActionStatus.Fail },
          },
          {
            to: '4',
            meta: { type: EdgeType.AnyOf, status: ActionStatus.Ok },
          },
        ],
        3: [
          {
            to: '4',
            meta: { type: EdgeType.AnyOf, status: ActionStatus.Fail },
          },
        ],
        4: [],
        5: [
          {
            to: '6',
            meta: { type: EdgeType.AllIn, status: ActionStatus.Ok },
          },
        ],
        6: [],
      })

      expect(graph.nodesDependsOnWorkflow).toEqual(createSet(['5']))
      expect(graph.nodesOutWorkflow).toEqual(createSet(['5', '6']))
      expect(graph.workflowStatusesByNode).toEqual(
        createMap({
          5: WorkflowStatus.Fail,
        })
      )
    })
  })
})
