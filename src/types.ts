import { ActionStatus, WorkflowStatus } from './enums'

export type ValidActionName = string | number | symbol

export interface ObjectDependency<SingleActionName = ValidActionName> {
  action: SingleActionName
  with: ActionStatus
}

export type Dependency<SingleActionName = ValidActionName> =
  | SingleActionName
  | ObjectDependency<SingleActionName>

export interface Action<
  SingleActionName extends ValidActionName,
  ActionName extends ValidActionName,
  ActionFinalData = unknown
> {
  needs?: Dependency<Exclude<ActionName, SingleActionName>>[]
  needsAnyOf?: Dependency<Exclude<ActionName, SingleActionName>>[]
  needsWorkflow?: WorkflowStatus
  run: (
    data: ActionFinalData
  ) =>
    | void
    | ActionStatus
    | WorkflowStatus
    | Promise<void>
    | Promise<ActionStatus>
    | Promise<WorkflowStatus>
}

export type Actions<ActionName extends ValidActionName, FinalData = unknown> = {
  [SingleActionName in ActionName]: Action<
    SingleActionName,
    ActionName,
    FinalData
  >
}

export interface WorkflowState {
  isFinished: boolean
  status: WorkflowStatus
}
