import { BaseError, CycleError, Logs } from './errors'

describe('util', () => {
  describe('errors', () => {
    test('Logs', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation()

      Logs.error('test 1', 'test 2')

      expect(console.error).toHaveBeenLastCalledWith(
        ['\n[JS Actions]', 'test 1', 'test 2'].join('\n')
      )

      spy.mockRestore()
    })

    test('BaseError', () => {
      const error = new BaseError('test 1', 'test 2')

      expect(error.message).toBe(
        ['\n[JS Actions]', 'test 1', 'test 2'].join('\n')
      )
    })

    test('CycleError', () => {
      const error = new CycleError([1, 2, 3])

      expect(error.message).toBe(
        [
          '\n[JS Actions]',
          'Action dependencies cycle detected in sequence:',
          '1 -> 2 -> 3',
          'Check your "actions" object.',
        ].join('\n')
      )
    })
  })
})
