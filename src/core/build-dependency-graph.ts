import {
  ValidActionName,
  Actions,
  Dependency,
  ObjectDependency,
} from '../types'
import { WorkflowStatus, ActionStatus } from '../enums'
import { DependencyGraph, EdgesIn, EdgesOut, EdgeType } from './types'
import { topologySortRTL } from './topology-sort'
import { getNodesOutWorkflow } from './get-nodes-out-workflow'

export function normalizeActionName<ActionName extends ValidActionName>(
  actionName: ActionName
): ActionName {
  return String(actionName) as ActionName
}

function normalizeDependency<ActionName extends ValidActionName>(
  dependency: Dependency<ActionName>
): ObjectDependency<ActionName> {
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

type DependencyProcessor = <ActionName extends ValidActionName>(
  actionName: ActionName,
  dependencies: Dependency<ActionName>[],
  edgesIn: EdgesIn<ActionName>,
  edgesOut: EdgesOut<ActionName>
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
  ActionName extends ValidActionName,
  ActionFinalData = unknown
>(actions: Actions<ActionName, ActionFinalData>): DependencyGraph<ActionName> {
  const actionNames = Object.keys(actions) as ActionName[]

  const nodes = actionNames

  const edgesIn = {} as EdgesIn<ActionName>
  for (const node of nodes) edgesIn[node] = []

  const edgesOut = {} as EdgesOut<ActionName>
  for (const node of nodes) edgesOut[node] = []

  const nodesDependsOnWorkflow: Set<ActionName> = new Set()
  const workflowStatusesByNode: Map<ActionName, WorkflowStatus> = new Map()

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
