import { Actions, ActionName, WorkflowState } from '../types'
import { ActionStatus, WorkflowStatus, NodeStatus } from '../enums'
import { buildDependencyGraph } from './build-dependency-graph'
import {
  getNodeStatus,
  getIndependentNodes,
  getNextNodes,
  getWorkflowNodes,
} from './node-utils'

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
  describe('node utils', () => {
    describe('getIndependentNodes', () => {
      test('no relations', () => {
        const actions: Actions<{
          '1': void
          '2': void
        }> = {
          '1': {
            run: () => {},
          },
          '2': {
            run: () => {},
          },
        }

        const graph = buildDependencyGraph(actions)

        expect(getIndependentNodes(graph)).toEqualNoOrder(['1', '2'])
      })

      test('some relations', () => {
        const actions: Actions<{
          '1': void
          '2': void
          '3': void
          '4': void
          '5': void
          '6': void
        }> = {
          '1': {
            run: () => {},
          },
          '2': {
            needs: ['1'],
            run: () => {},
          },
          '3': {
            run: () => {},
          },
          '4': {
            needsAnyOf: ['3'],
            run: () => {},
          },
          '5': {
            needsWorkflow: WorkflowStatus.Ok,
            run: () => {},
          },
          '6': {
            needs: ['3'],
            run: () => {},
          },
        }

        const graph = buildDependencyGraph(actions)

        expect(getIndependentNodes(graph)).toEqualNoOrder(['1', '3'])
      })
    })

    describe('getWorkflowNodes', () => {
      test('basic', () => {
        const actions: Actions<{
          '1': void
          '2': void
          '3': void
          '4': void
          '5': void
          '6': void
        }> = {
          '1': {
            run: () => {},
          },
          '2': {
            needs: ['1'],
            run: () => {},
          },
          '3': {
            needsWorkflow: WorkflowStatus.Any,
            run: () => {},
          },
          '4': {
            needsAnyOf: ['3'],
            run: () => {},
          },
          '5': {
            needsWorkflow: WorkflowStatus.Ok,
            run: () => {},
          },
          '6': {
            needs: ['3'],
            needsAnyOf: ['5'],
            run: () => {},
          },
        }

        const graph = buildDependencyGraph(actions)

        expect(getWorkflowNodes(graph)).toEqualNoOrder(['3', '5'])
      })
    })

    describe('getNextNodes', () => {
      test('basic', () => {
        const actions: Actions<{
          '1': void
          '2': void
          '3': void
          '4': void
        }> = {
          '1': {
            run: () => {},
          },
          '2': {
            needs: ['1'],
            run: () => {},
          },
          '3': {
            needs: ['1'],
            run: () => {},
          },
          '4': {
            needsAnyOf: ['3'],
            run: () => {},
          },
        }

        const graph = buildDependencyGraph(actions)

        expect(getNextNodes('1', graph)).toEqualNoOrder(['2', '3'])
        expect(getNextNodes('2', graph)).toEqualNoOrder([])
        expect(getNextNodes('3', graph)).toEqualNoOrder(['4'])
        expect(getNextNodes('4', graph)).toEqualNoOrder([])
      })
    })

    describe('getNodeStatus', () => {
      // we can't use numbers here because names aren't normalized

      const actions: Actions<{
        '1': void
        '2': void
        '3': void
        '4': void
        '5': void
        '6': void
        '7': void
        '8': void
        '9': void
        '10': void
      }> = {
        '1': {
          run: () => {},
        },
        '2': {
          run: () => {},
        },
        '3': {
          run: () => {},
        },
        '4': {
          run: () => {},
        },
        '5': {
          run: () => {},
        },
        '7': {
          run: () => {},
        },
        '6': {
          needs: [
            '1',
            '2',
            { action: '7', with: ActionStatus.Fail },
            { action: '5', with: ActionStatus.Any },
          ],
          needsAnyOf: ['3', '4'],
          run: () => {},
        },
        '8': {
          needsWorkflow: WorkflowStatus.Ok,
          run: () => {},
        },
        '9': {
          needsWorkflow: WorkflowStatus.Fail,
          run: () => {},
        },
        '10': {
          needsWorkflow: WorkflowStatus.Any,
          run: () => {},
        },
      }

      const graph = buildDependencyGraph(actions)

      test('AllIn dependencies', () => {
        expect(
          getNodeStatus({
            node: '6',
            graph,
            statusMap: createMap({ '6': ActionStatus.Ok }),
            runningSet: createSet([]),
            conditionsNotMetSet: createSet([]),
            workflowState: {
              isFinished: false,
              status: WorkflowStatus.Ok,
            },
          })
        ).toBe(NodeStatus.Finished)

        expect(
          getNodeStatus({
            node: '6',
            graph,
            statusMap: createMap({}),
            runningSet: createSet(['6']),
            conditionsNotMetSet: createSet([]),
            workflowState: {
              isFinished: false,
              status: WorkflowStatus.Ok,
            },
          })
        ).toBe(NodeStatus.Running)

        expect(
          getNodeStatus({
            node: '6',
            graph,
            statusMap: createMap({
              '1': ActionStatus.Ok,
              '5': ActionStatus.Ok,
              '3': ActionStatus.Ok,
              '4': ActionStatus.Ok,
            }),
            runningSet: createSet([]),
            conditionsNotMetSet: createSet([]),
            workflowState: {
              isFinished: false,
              status: WorkflowStatus.Ok,
            },
          })
        ).toBe(NodeStatus.NotReady)

        expect(
          getNodeStatus({
            node: '6',
            graph,
            statusMap: createMap({
              '1': ActionStatus.Ok,
              '2': ActionStatus.Ok,
              '3': ActionStatus.Ok,
              '4': ActionStatus.Ok,
            }),
            runningSet: createSet([]),
            conditionsNotMetSet: createSet([]),
            workflowState: {
              isFinished: false,
              status: WorkflowStatus.Ok,
            },
          })
        ).toBe(NodeStatus.NotReady)

        expect(
          getNodeStatus({
            node: '6',
            graph,
            statusMap: createMap({
              '1': ActionStatus.Ok,
              '5': ActionStatus.Skip,
              '3': ActionStatus.Ok,
              '4': ActionStatus.Ok,
            }),
            runningSet: createSet(['2']),
            conditionsNotMetSet: createSet([]),
            workflowState: {
              isFinished: false,
              status: WorkflowStatus.Ok,
            },
          })
        ).toBe(NodeStatus.NotReady)

        expect(
          getNodeStatus({
            node: '6',
            graph,
            statusMap: createMap({
              '1': ActionStatus.Ok,
              '2': ActionStatus.Ok,
              '3': ActionStatus.Ok,
              '4': ActionStatus.Ok,
            }),
            runningSet: createSet(['5']),
            conditionsNotMetSet: createSet([]),
            workflowState: {
              isFinished: false,
              status: WorkflowStatus.Ok,
            },
          })
        ).toBe(NodeStatus.NotReady)

        expect(
          getNodeStatus({
            node: '6',
            graph,
            statusMap: createMap({
              '1': ActionStatus.Ok,
              '2': ActionStatus.Ok,
              '5': ActionStatus.Fail,
              '7': ActionStatus.Fail,
              '3': ActionStatus.Ok,
              '4': ActionStatus.Ok,
            }),
            runningSet: createSet([]),
            conditionsNotMetSet: createSet([]),
            workflowState: {
              isFinished: false,
              status: WorkflowStatus.Ok,
            },
          })
        ).toBe(NodeStatus.Ready)

        expect(
          getNodeStatus({
            node: '6',
            graph,
            statusMap: createMap({
              '1': ActionStatus.Ok,
              '2': ActionStatus.Ok,
              '5': ActionStatus.Skip,
              '7': ActionStatus.Fail,
              '3': ActionStatus.Ok,
              '4': ActionStatus.Ok,
            }),
            runningSet: createSet([]),
            conditionsNotMetSet: createSet([]),
            workflowState: {
              isFinished: false,
              status: WorkflowStatus.Ok,
            },
          })
        ).toBe(NodeStatus.Ready)

        expect(
          getNodeStatus({
            node: '6',
            graph,
            statusMap: createMap({
              '1': ActionStatus.Ok,
              '2': ActionStatus.Ok,
              '5': ActionStatus.Skip,
              '7': ActionStatus.Fail,
              '3': ActionStatus.Ok,
              '4': ActionStatus.Ok,
            }),
            runningSet: createSet([]),
            conditionsNotMetSet: createSet(['6']),
            workflowState: {
              isFinished: false,
              status: WorkflowStatus.Ok,
            },
          })
        ).toBe(NodeStatus.Skipped)

        expect(
          getNodeStatus({
            node: '6',
            graph,
            statusMap: createMap({
              '1': ActionStatus.Fail,
              '3': ActionStatus.Ok,
              '4': ActionStatus.Ok,
            }),
            runningSet: createSet([]),
            conditionsNotMetSet: createSet([]),
            workflowState: {
              isFinished: false,
              status: WorkflowStatus.Ok,
            },
          })
        ).toBe(NodeStatus.Skipped)

        expect(
          getNodeStatus({
            node: '6',
            graph,
            statusMap: createMap({
              '2': ActionStatus.Fail,
              '3': ActionStatus.Ok,
              '4': ActionStatus.Ok,
            }),
            runningSet: createSet([]),
            conditionsNotMetSet: createSet([]),
            workflowState: {
              isFinished: false,
              status: WorkflowStatus.Ok,
            },
          })
        ).toBe(NodeStatus.Skipped)

        expect(
          getNodeStatus({
            node: '6',
            graph,
            statusMap: createMap({
              '7': ActionStatus.Ok,
              '3': ActionStatus.Ok,
              '4': ActionStatus.Ok,
            }),
            runningSet: createSet([]),
            conditionsNotMetSet: createSet([]),
            workflowState: {
              isFinished: false,
              status: WorkflowStatus.Ok,
            },
          })
        ).toBe(NodeStatus.Skipped)

        expect(
          getNodeStatus({
            node: '6',
            graph,
            statusMap: createMap({
              '7': ActionStatus.Ok,
              '3': ActionStatus.Ok,
              '4': ActionStatus.Ok,
            }),
            runningSet: createSet(['1', '2']),
            conditionsNotMetSet: createSet([]),
            workflowState: {
              isFinished: false,
              status: WorkflowStatus.Ok,
            },
          })
        ).toBe(NodeStatus.Skipped)
      })

      test('AnyOf dependencies', () => {
        expect(
          getNodeStatus({
            node: '6',
            graph,
            statusMap: createMap({
              '1': ActionStatus.Ok,
              '2': ActionStatus.Ok,
              '5': ActionStatus.Ok,
              '7': ActionStatus.Fail,
            }),
            runningSet: createSet([]),
            conditionsNotMetSet: createSet([]),
            workflowState: {
              isFinished: false,
              status: WorkflowStatus.Ok,
            },
          })
        ).toBe(NodeStatus.NotReady)

        expect(
          getNodeStatus({
            node: '6',
            graph,
            statusMap: createMap({
              '1': ActionStatus.Ok,
              '2': ActionStatus.Ok,
              '5': ActionStatus.Ok,
              '7': ActionStatus.Fail,
            }),
            runningSet: createSet(['3']),
            conditionsNotMetSet: createSet([]),
            workflowState: {
              isFinished: false,
              status: WorkflowStatus.Ok,
            },
          })
        ).toBe(NodeStatus.NotReady)

        expect(
          getNodeStatus({
            node: '6',
            graph,
            statusMap: createMap({
              '1': ActionStatus.Ok,
              '2': ActionStatus.Ok,
              '5': ActionStatus.Ok,
              '7': ActionStatus.Fail,
            }),
            runningSet: createSet(['4']),
            conditionsNotMetSet: createSet([]),
            workflowState: {
              isFinished: false,
              status: WorkflowStatus.Ok,
            },
          })
        ).toBe(NodeStatus.NotReady)

        expect(
          getNodeStatus({
            node: '6',
            graph,
            statusMap: createMap({
              '1': ActionStatus.Ok,
              '2': ActionStatus.Ok,
              '5': ActionStatus.Ok,
              '7': ActionStatus.Fail,
              '3': ActionStatus.Fail,
            }),
            runningSet: createSet([]),
            conditionsNotMetSet: createSet([]),
            workflowState: {
              isFinished: false,
              status: WorkflowStatus.Ok,
            },
          })
        ).toBe(NodeStatus.NotReady)

        expect(
          getNodeStatus({
            node: '6',
            graph,
            statusMap: createMap({
              '1': ActionStatus.Ok,
              '2': ActionStatus.Ok,
              '5': ActionStatus.Ok,
              '7': ActionStatus.Fail,
              '3': ActionStatus.Ok,
            }),
            runningSet: createSet([]),
            conditionsNotMetSet: createSet([]),
            workflowState: {
              isFinished: false,
              status: WorkflowStatus.Ok,
            },
          })
        ).toBe(NodeStatus.Ready)

        expect(
          getNodeStatus({
            node: '6',
            graph,
            statusMap: createMap({
              '1': ActionStatus.Ok,
              '2': ActionStatus.Ok,
              '5': ActionStatus.Ok,
              '7': ActionStatus.Fail,
              '4': ActionStatus.Ok,
            }),
            runningSet: createSet([]),
            conditionsNotMetSet: createSet([]),
            workflowState: {
              isFinished: false,
              status: WorkflowStatus.Ok,
            },
          })
        ).toBe(NodeStatus.Ready)

        expect(
          getNodeStatus({
            node: '6',
            graph,
            statusMap: createMap({
              '1': ActionStatus.Ok,
              '2': ActionStatus.Ok,
              '5': ActionStatus.Ok,
              '7': ActionStatus.Fail,
              '3': ActionStatus.Fail,
              '4': ActionStatus.Ok,
            }),
            runningSet: createSet([]),
            conditionsNotMetSet: createSet([]),
            workflowState: {
              isFinished: false,
              status: WorkflowStatus.Ok,
            },
          })
        ).toBe(NodeStatus.Ready)

        expect(
          getNodeStatus({
            node: '6',
            graph,
            statusMap: createMap({
              '1': ActionStatus.Ok,
              '2': ActionStatus.Ok,
              '5': ActionStatus.Ok,
              '7': ActionStatus.Fail,
              '3': ActionStatus.Fail,
              '4': ActionStatus.Fail,
            }),
            runningSet: createSet([]),
            conditionsNotMetSet: createSet([]),
            workflowState: {
              isFinished: false,
              status: WorkflowStatus.Ok,
            },
          })
        ).toBe(NodeStatus.Skipped)
      })

      test('Workflow dependencies', () => {
        const config = (node: ActionName, workflowState: WorkflowState) => ({
          node,
          graph,
          statusMap: createMap({}),
          runningSet: createSet([]),
          conditionsNotMetSet: createSet([]),
          workflowState,
        })

        // not ready

        expect(
          getNodeStatus(
            config('8', { isFinished: false, status: WorkflowStatus.Ok })
          )
        ).toBe(NodeStatus.NotReady)

        expect(
          getNodeStatus(
            config('9', { isFinished: false, status: WorkflowStatus.Ok })
          )
        ).toBe(NodeStatus.NotReady)

        expect(
          getNodeStatus(
            config('10', { isFinished: false, status: WorkflowStatus.Ok })
          )
        ).toBe(NodeStatus.NotReady)

        // skipped

        expect(
          getNodeStatus(
            config('8', { isFinished: true, status: WorkflowStatus.Fail })
          )
        ).toBe(NodeStatus.Skipped)

        expect(
          getNodeStatus(
            config('9', { isFinished: true, status: WorkflowStatus.Ok })
          )
        ).toBe(NodeStatus.Skipped)

        // ready

        expect(
          getNodeStatus(
            config('8', { isFinished: true, status: WorkflowStatus.Ok })
          )
        ).toBe(NodeStatus.Ready)

        expect(
          getNodeStatus(
            config('9', { isFinished: true, status: WorkflowStatus.Fail })
          )
        ).toBe(NodeStatus.Ready)

        expect(
          getNodeStatus(
            config('10', { isFinished: true, status: WorkflowStatus.Ok })
          )
        ).toBe(NodeStatus.Ready)

        expect(
          getNodeStatus(
            config('10', { isFinished: true, status: WorkflowStatus.Fail })
          )
        ).toBe(NodeStatus.Ready)
      })
    })
  })
})
