/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/consistent-type-definitions */
import { Actions, ProvidedDeps, ReturnTypes, WorkflowState } from './types'
import { Logs } from './util/errors'
import {
  ActionStatus,
  WorkflowStatus,
  NodeStatus,
  getActionStatusFromWorkflowStatus,
  isWorkflowStatus,
} from './enums'
import { buildDependencyGraph } from './core/build-dependency-graph'
import { createDefer } from './util/defer'
import {
  getWorkflowNodes,
  getNextNodes,
  getIndependentNodes,
  getNodeStatus,
} from './core/node-utils'

function normalizeActionStatus(status: ActionStatus): ActionStatus {
  if (status === ActionStatus.Any) {
    Logs.error(
      'Please do not use ActionStatus.Any in action runners.',
      'It is designed to use only in dependency arrays.',
      'Any returned ActionStatus.Any acts like ActionStatus.Ok.'
    )

    return ActionStatus.Ok
  }

  return status
}

function normalizeWorkflowStatus(status: WorkflowStatus): WorkflowStatus {
  if (status === WorkflowStatus.Any) {
    Logs.error(
      'Please do not use WorkflowStatus.Any in action runners.',
      'It is designed to use only in dependency arrays.',
      'Any returned WorkflowStatus.Any acts like WorkflowStatus.Ok.'
    )

    return WorkflowStatus.Ok
  }

  return status
}

function createTemporaryStatus() {
  let temp: ActionStatus | WorkflowStatus | null = null

  const set = (status: ActionStatus | WorkflowStatus) => {
    temp = status
  }

  interface ExtractionResult {
    action: ActionStatus
    workflow: WorkflowStatus | null
  }

  const extract = (): ExtractionResult => {
    if (!temp) {
      temp = ActionStatus.Ok
    }

    temp = isWorkflowStatus(temp)
      ? normalizeWorkflowStatus(temp)
      : normalizeActionStatus(temp)

    const actionStatus = isWorkflowStatus(temp)
      ? getActionStatusFromWorkflowStatus(temp)
      : temp

    const workflowStatus = isWorkflowStatus(temp) ? temp : null

    return {
      action: actionStatus,
      workflow: workflowStatus,
    }
  }

  return {
    set,
    extract,
  }
}

type ResolvedDeps<TReturnTypes extends ReturnTypes> = {
  [ActionName in keyof TReturnTypes]: TReturnTypes[ActionName]
}

// interface ResolvedDepsController<
//   TReturnTypes extends ReturnTypes,
//   TActionName extends keyof TReturnTypes = keyof TReturnTypes
// > {
//   check: <TDeps extends Array<TActionName>>(deps: TDeps) => deps
//   getMultiple: <TDeps extends Array<TActionName>>(
//     deps: TDeps
//   ) => ProvidedDeps<TReturnTypes, TDeps>
//   getOne: <T extends TActionName>(name: T) => TReturnTypes[T]
//   setOne: <T extends TActionName>(name: T, value: TReturnTypes[T]) => void
// }

function createResolvedDepsController<TReturnTypes extends ReturnTypes>() {
  type FullResolvedDeps = ResolvedDeps<TReturnTypes>
  type PartialResolvedDeps = Partial<FullResolvedDeps>

  const resolvedDeps: PartialResolvedDeps = {}

  const getMultiple = <TDeps extends Array<keyof TReturnTypes>>(
    deps: TDeps
  ): ProvidedDeps<TReturnTypes, TDeps> => {
    const temp: Partial<ProvidedDeps<TReturnTypes, TDeps>> = {}

    for (const dep of deps) {
      const hasResolved = dep in resolvedDeps

      if (!hasResolved) {
        throw new Error(`Dependency ${dep} has not resolved yet`)
      }

      temp[dep] = resolvedDeps[dep]
    }

    return temp as ProvidedDeps<TReturnTypes, TDeps>
  }

  const setOne = <TDep extends keyof TReturnTypes>(
    dep: TDep,
    value: TReturnTypes[TDep]
  ) => {
    resolvedDeps[dep] = value
  }

  return {
    getMultiple,
    setOne,
  }
}

// eslint-disable-next-line sonarjs/cognitive-complexity
export async function runPipeline<TReturnTypes extends ReturnTypes>(
  actions: Actions<TReturnTypes>
): Promise<void> {
  type ActionName = keyof TReturnTypes

  const dependencyGraph = buildDependencyGraph(actions)
  const resolvedDepsController = createResolvedDepsController<TReturnTypes>()

  let queueDefer = createDefer()
  const actionQueue: ActionName[] = []

  const statusMap: Map<ActionName, ActionStatus> = new Map()
  const runningSet: Set<ActionName> = new Set()
  const conditionsNotMetSet: Set<ActionName> = new Set()

  const workflowState: WorkflowState = {
    isFinished: false,
    status: WorkflowStatus.Ok,
  }

  const checkQueue = () => {
    if (actionQueue.length > 0 || runningSet.size === 0) {
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
      if (statusMap.has(node)) continue
      if (runningSet.has(node)) continue
      statusMap.set(node, ActionStatus.Skip)
    }

    // run workflow-dependent nodes
    const workflowActions = getWorkflowNodes(dependencyGraph)
    actionQueue.push(...workflowActions)
  }

  const runAction = async (actionName: ActionName) => {
    const nodeStatus = getNodeStatus({
      node: actionName,
      graph: dependencyGraph,
      statusMap,
      runningSet,
      conditionsNotMetSet,
      workflowState,
    })

    if (
      nodeStatus === NodeStatus.Running ||
      nodeStatus === NodeStatus.Finished ||
      nodeStatus === NodeStatus.NotReady
    ) {
      // we may not check next nodes with these statuses
      return
    }

    const temporaryStatus = createTemporaryStatus()

    const applyStatusAndContinue = () => {
      const statuses = temporaryStatus.extract()
      statusMap.set(actionName, statuses.action)

      if (statuses.workflow) {
        finishWorkflow(statuses.workflow)
      }

      const nextActions = getNextNodes(actionName, dependencyGraph)

      for (const nextAction of nextActions) {
        actionQueue.push(nextAction)
      }
    }

    if (nodeStatus === NodeStatus.Skipped) {
      temporaryStatus.set(ActionStatus.Skip)
      applyStatusAndContinue()
      return
    }

    /*
     * Node is ready
     */

    const {
      if: checkConditions = () => true,
      deps = [],
      run,
    } = actions[actionName]

    const resolvedDeps = resolvedDepsController.getMultiple(deps)

    const conditionsMet = checkConditions(resolvedDeps)

    if (!conditionsMet) {
      conditionsNotMetSet.add(actionName)
      temporaryStatus.set(ActionStatus.Skip)
      applyStatusAndContinue()
      return
    }

    // we should do it before any async code
    runningSet.add(actionName)

    const actionActions = {
      setStatus: temporaryStatus.set,
    }

    try {
      const result = await run(resolvedDeps, actionActions)
      resolvedDepsController.setOne(actionName, result)
    } catch {}

    runningSet.delete(actionName)

    applyStatusAndContinue()
  }

  const independentActions = getIndependentNodes(dependencyGraph)
  actionQueue.push(...independentActions)

  while (statusMap.size !== dependencyGraph.nodes.length) {
    if (actionQueue.length === 0) {
      await queueDefer.promise
    }

    /*
     * we could get into cycle only if there are some actions remained
     * but if currently running actions count is 0, we'll never get new actions in queue
     * the only case when this possible is the workflow end
     */
    if (actionQueue.length === 0 && runningSet.size === 0) {
      finishWorkflow(WorkflowStatus.Ok)
      continue
    }

    const nextAction = actionQueue.pop()
    if (nextAction === undefined) continue

    runAction(nextAction).then(checkQueue)
  }
}
