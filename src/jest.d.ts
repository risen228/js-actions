declare namespace jest {
  interface Matchers<R> {
    toEqualNoOrder(array: unknown[]): CustomMatcherResult
  }
}
