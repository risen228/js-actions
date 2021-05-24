export interface Defer<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error: Error) => void
}

export function createDefer<T extends unknown = void>(): Defer<T> {
  const defer: Partial<Defer<T>> = {}

  defer.promise = new Promise((resolve, reject) => {
    defer.resolve = resolve
    defer.reject = reject
  })

  return defer as Defer<T>
}
