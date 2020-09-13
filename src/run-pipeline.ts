import { ValidActionName, Actions, WorkflowState } from './types'
import { Logs } from './util/errors'
import {
  ActionStatus,
  WorkflowStatus,
  NodeStatus,
  isWorkflowStatus,
  isActionStatus,
  getActionStatusFromWorkflowStatus,
} from './enums'
import { buildDependencyGraph } from './core/build-dependency-graph'
import { createDefer } from './util/defer'
import {
  getWorkflowNodes,
  getNextNodes,
  getIndependentNodes,
  getNodeStatus,
} from './core/node-utils'

function normalizeActionResult(
  result: void | ActionStatus | WorkflowStatus
): ActionStatus | WorkflowStatus {
  if (!result) return ActionStatus.Ok

  if (result === ActionStatus.Any) {
    Logs.error(
      'Please do not use ActionStatus.Any in action runners.',
      'It is designed to use only in dependency arrays.',
      'Any returned ActionStatus.Any acts like ActionStatus.Ok.'
    )

    return ActionStatus.Ok
  }

  if (result === WorkflowStatus.Any) {
    Logs.error(
      'Please do not use WorkflowStatus.Any in action runners.',
      'It is designed to use only in dependency arrays.',
      'Any returned WorkflowStatus.Any acts like WorkflowStatus.Ok.'
    )

    return WorkflowStatus.Ok
  }

  return result
}

export async function runPipeline<
  ActionsConfig extends Record<ValidActionName, unknown>,
  WorkflowData,
  ActionData,
  ActionName extends keyof ActionsConfig
>({
  actions,
  getWorkflowData = () => ({} as WorkflowData),
  getActionData = () => ({} as ActionData),
}: {
  actions: Actions<ActionName, WorkflowData & ActionData>
  getWorkflowData?: () => WorkflowData | Promise<WorkflowData>
  getActionData?: () => ActionData | Promise<ActionData>
}): Promise<void> {
  const dependencyGraph = buildDependencyGraph(actions)

  let queueDefer = createDefer()
  const actionQueue: ActionName[] = []

  const actionResultMap: Map<ActionName, ActionStatus> = new Map()
  const runningActionsSet: Set<ActionName> = new Set()

  const workflowState: WorkflowState = {
    isFinished: false,
    status: WorkflowStatus.Ok,
  }

  const workflowData = await getWorkflowData()

  const checkQueue = () => {
    if (actionQueue.length > 0 || runningActionsSet.size === 0) {
      queueDefer.resolve()
      queueDefer = createDefer()
    }
  }

  const finishWorkflow = (status: WorkflowStatus) => {
    // another async action may have returned WorkflowStatus already
    if (workflowState.isFinished) return

    workflowState.isFinished = true
    workflowState.status = status

    // skip remaining nodes in workflow
    for (const node of dependencyGraph.nodes) {
      if (dependencyGraph.nodesOutWorkflow.has(node)) continue
      if (actionResultMap.has(node)) continue
      if (runningActionsSet.has(node)) continue
      actionResultMap.set(node, ActionStatus.Skip)
    }

    // run workflow-dependent nodes
    const workflowActions = getWorkflowNodes(dependencyGraph)
    actionQueue.push(...workflowActions)
  }

  const runAction = async (actionName: ActionName) => {
    const status = getNodeStatus({
      node: actionName,
      graph: dependencyGraph,
      resultMap: actionResultMap,
      runSet: runningActionsSet,
      workflowState,
    })

    if (
      status === NodeStatus.Running ||
      status === NodeStatus.Finished ||
      status === NodeStatus.NotReady
    ) {
      // we may not check next nodes with these statuses
      return
    }

    if (status === NodeStatus.Skipped) {
      actionResultMap.set(actionName, ActionStatus.Skip)
    }

    if (status === NodeStatus.Ready) {
      // we should do it before any async code
      runningActionsSet.add(actionName)

      const actionData = await getActionData()

      const actionFinalData = {
        ...workflowData,
        ...actionData,
      }

      const action = actions[actionName as ActionName]

      const result = await Promise.resolve()
        .then(() => action.run(actionFinalData))
        .then(normalizeActionResult)
        .catch(() => ActionStatus.Fail)

      runningActionsSet.delete(actionName)

      if (isWorkflowStatus(result)) {
        const actionStatus = getActionStatusFromWorkflowStatus(result)
        actionResultMap.set(actionName, actionStatus)

        finishWorkflow(result)
      }

      if (isActionStatus(result)) {
        actionResultMap.set(actionName, result)
      }
    }

    const nextActions = getNextNodes(actionName, dependencyGraph)

    for (const nextAction of nextActions) {
      actionQueue.push(nextAction)
    }
  }

  const independentActions = getIndependentNodes(dependencyGraph)
  actionQueue.push(...independentActions)

  while (actionResultMap.size !== dependencyGraph.nodes.length) {
    if (actionQueue.length === 0) {
      await queueDefer.promise
    }

    /*
     * we could get into cycle only if there are some actions remained
     * but if currently running actions count is 0, we'll never get new actions in queue
     * the only case when this possible is the workflow end
     */
    if (actionQueue.length === 0 && runningActionsSet.size === 0) {
      finishWorkflow(WorkflowStatus.Ok)
      continue
    }

    const nextAction = actionQueue.pop()
    if (nextAction === undefined) continue

    runAction(nextAction).then(checkQueue)
  }
}
