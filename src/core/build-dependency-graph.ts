import { ActionName, Actions, Dependency, ObjectDependency } from '../types'
import { WorkflowStatus, ActionStatus } from '../enums'
import { DependencyGraph, EdgesIn, EdgesOut, EdgeType } from './types'
import { topologySortRTL } from './topology-sort'
import { getNodesOutWorkflow } from './get-nodes-out-workflow'

export function normalizeActionName<TActionName extends ActionName>(
  actionName: TActionName
): TActionName {
  return String(actionName) as TActionName
}

function normalizeDependency<TActionName extends ActionName>(
  dependency: Dependency<TActionName>
): ObjectDependency<TActionName> {
  if (typeof dependency === 'object') {
    return {
      action: normalizeActionName(dependency.action),
      with: dependency.with,
    }
  }

  return {
    action: normalizeActionName(dependency),
    with: ActionStatus.Ok,
  }
}

type DependencyProcessor = <TActionName extends ActionName>(
  actionName: TActionName,
  dependencies: Dependency<TActionName>[],
  edgesIn: EdgesIn<TActionName>,
  edgesOut: EdgesOut<TActionName>
) => void

export function createDependencyProcessor(
  edgeType: EdgeType
): DependencyProcessor {
  return (actionName, dependencies, edgesIn, edgesOut) => {
    for (const dependency of dependencies) {
      const objectDependency = normalizeDependency(dependency)

      const meta = {
        type: edgeType,
        status: objectDependency.with,
      }

      edgesIn[actionName].push({
        from: objectDependency.action,
        meta,
      })

      edgesOut[objectDependency.action].push({
        to: normalizeActionName(actionName),
        meta,
      })
    }
  }
}

const processAllInDependencies = createDependencyProcessor(EdgeType.AllIn)
const processAnyOfDependencies = createDependencyProcessor(EdgeType.AnyOf)

export function buildDependencyGraph<
  TActionName extends ActionName,
  TActionFinalData = unknown
>(
  actions: Actions<TActionName, TActionFinalData>
): DependencyGraph<TActionName> {
  const actionNames = Object.keys(actions) as TActionName[]

  const nodes = actionNames

  const edgesIn = {} as EdgesIn<TActionName>
  for (const node of nodes) edgesIn[node] = []

  const edgesOut = {} as EdgesOut<TActionName>
  for (const node of nodes) edgesOut[node] = []

  const nodesDependsOnWorkflow: Set<TActionName> = new Set()
  const workflowStatusesByNode: Map<TActionName, WorkflowStatus> = new Map()

  for (const actionName in actions) {
    const { needs = [], needsAnyOf = [], needsWorkflow } = actions[actionName]

    processAllInDependencies(actionName, needs, edgesIn, edgesOut)
    processAnyOfDependencies(actionName, needsAnyOf, edgesIn, edgesOut)

    if (needsWorkflow) {
      nodesDependsOnWorkflow.add(actionName)
      workflowStatusesByNode.set(actionName, needsWorkflow)
    }
  }

  const sortedNodes = topologySortRTL(nodes, edgesOut)

  const nodesOutWorkflow = getNodesOutWorkflow(
    sortedNodes,
    edgesOut,
    nodesDependsOnWorkflow
  )

  return {
    nodes,
    edgesIn,
    edgesOut,
    nodesDependsOnWorkflow,
    workflowStatusesByNode,
    nodesOutWorkflow,
  }
}
