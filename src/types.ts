import { ActionStatus, WorkflowStatus } from './enums'

export type ActionName = string | number | symbol

export interface ObjectDependency<TActionName = ActionName> {
  action: TActionName
  with: ActionStatus
}

export type Dependency<TActionName = ActionName> =
  | TActionName
  | ObjectDependency<TActionName>

export interface Action<
  TActionName extends ActionName,
  TAllActionName extends ActionName,
  TActionFinalData = unknown
> {
  needs?: Dependency<Exclude<TAllActionName, TActionName>>[]
  needsAnyOf?: Dependency<Exclude<TAllActionName, TActionName>>[]
  needsWorkflow?: WorkflowStatus
  run: (
    data: TActionFinalData
  ) =>
    | void
    | ActionStatus
    | WorkflowStatus
    | Promise<void>
    | Promise<ActionStatus>
    | Promise<WorkflowStatus>
}

export type Actions<TActionName extends ActionName, FinalData = unknown> = {
  [SingleActionName in TActionName]: Action<
    SingleActionName,
    TActionName,
    FinalData
  >
}

export interface WorkflowState {
  isFinished: boolean
  status: WorkflowStatus
}
