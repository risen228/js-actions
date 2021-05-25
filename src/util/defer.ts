export interface Defer<T> {
  readonly promise: Promise<T>
  readonly resolve: (value: T) => void
  readonly reject: (error: Error) => void
}

export function createDefer<T extends unknown = void>(): Defer<T> {
  let resolveFn: Defer<T>['resolve']
  let rejectFn: Defer<T>['reject']

  return {
    promise: new Promise((resolve, reject) => {
      resolveFn = resolve
      rejectFn = reject
    }),
    get resolve() {
      return resolveFn
    },
    get reject() {
      return rejectFn
    },
  }
}
