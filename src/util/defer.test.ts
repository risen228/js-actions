import { createDefer } from './defer'

describe('util', () => {
  describe('Defer', () => {
    test('resolve without value', () => {
      const defer = createDefer()
      const order: number[] = []

      // 1 - create defer
      // 2 - resolve
      // 3 - promise resolved

      order.push(1)
      defer.promise.then(() => order.push(3))

      Promise.resolve()
        .then(() => {
          order.push(2)
          defer.resolve()
        })
        .then(() => {
          expect(order).toEqual([1, 2, 3])
        })
    })

    test('resolve with value', () => {
      const defer = createDefer<string>()
      const order: number[] = []

      // 1 - create defer
      // 2 - resolve
      // 3 - promise resolved

      order.push(1)
      defer.promise.then(() => order.push(3))

      Promise.resolve()
        .then(() => {
          order.push(2)
          defer.resolve('foo')
          return defer.promise
        })
        .then((value) => {
          expect(order).toEqual([1, 2, 3])
          expect(value).toBe('foo')
        })
    })

    test('reject without reason', () => {
      const defer = createDefer()
      const order: number[] = []

      // 1 - create defer
      // 2 - reject
      // 3 - promise rejected

      order.push(1)
      defer.promise.catch(() => order.push(3))

      Promise.resolve()
        .then(() => {
          order.push(2)
          defer.reject()
        })
        .then(() => {
          expect(order).toEqual([1, 2, 3])
        })
    })

    test('reject with reason', () => {
      const defer = createDefer<never, string>()
      const order: number[] = []

      // 1 - create defer
      // 2 - reject
      // 3 - promise rejected

      order.push(1)
      defer.promise.catch(() => order.push(3))

      Promise.resolve()
        .then(() => {
          order.push(2)
          defer.reject('bar')
          return defer.promise
        })
        .catch((error) => {
          expect(order).toEqual([1, 2, 3])
          expect(error).toBe('bar')
        })
    })
  })
})
