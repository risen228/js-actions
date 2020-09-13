export enum ActionStatus {
  Ok = 'JS-ACTIONS/ActionStatus.Ok',
  Fail = 'JS-ACTIONS/ActionStatus.Fail',
  Cancel = 'JS-ACTIONS/ActionStatus.Cancel',
  Skip = 'JS-ACTIONS/ActionStatus.Skip',
  Any = 'JS-ACTIONS/ActionStatus.Any',
}

export enum WorkflowStatus {
  Ok = 'JS-ACTIONS/WorkflowStatus.Ok',
  Fail = 'JS-ACTIONS/WorkflowStatus.Fail',
  Any = 'JS-ACTIONS/WorkflowStatus.Any',
}

export enum NodeStatus {
  Running = 'JS-ACTIONS/NodeStatus.Running',
  Finished = 'JS-ACTIONS/NodeStatus.Finished',
  NotReady = 'JS-ACTIONS/NodeStatus.NotReady',
  Ready = 'JS-ACTIONS/NodeStatus.Ready',
  Skipped = 'JS-ACTIONS/NodeStatus.Skipped',
}

const enums = [ActionStatus, WorkflowStatus, NodeStatus]
enums.forEach(Object.freeze)

const mapWorkflowStatusToActionStatus = {
  [WorkflowStatus.Ok]: ActionStatus.Ok,
  [WorkflowStatus.Fail]: ActionStatus.Fail,
  [WorkflowStatus.Any]: ActionStatus.Any,
}

export function getActionStatusFromWorkflowStatus(
  workflowStatus: WorkflowStatus
): ActionStatus {
  return mapWorkflowStatusToActionStatus[workflowStatus]
}

type AnyStatus = ActionStatus | WorkflowStatus | NodeStatus

const statusToEnumMap: Map<
  AnyStatus,
  typeof ActionStatus | typeof WorkflowStatus | typeof NodeStatus
> = new Map()

for (const statuses of [ActionStatus, WorkflowStatus, NodeStatus]) {
  for (const value of Object.values(statuses)) {
    statusToEnumMap.set(value as AnyStatus, statuses)
  }
}

export function isActionStatus(status: AnyStatus): status is ActionStatus {
  return statusToEnumMap.get(status) === ActionStatus
}

export function isWorkflowStatus(status: AnyStatus): status is WorkflowStatus {
  return statusToEnumMap.get(status) === WorkflowStatus
}
