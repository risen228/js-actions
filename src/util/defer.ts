export interface Defer<T, E> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason: E) => void
}

export function createDefer<T = void, E = void>(): Defer<T, E> {
  const defer: Partial<Defer<T, E>> = {}

  defer.promise = new Promise((resolve, reject) => {
    defer.resolve = resolve
    defer.reject = reject
  })

  return defer as Defer<T, E>
}
