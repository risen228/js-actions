# JS Actions

```javascript
type ExampleReturnTypes = {
  first: number
  second: number
  sum: number
  even: boolean
  logEven: void
  logOdd: void
}

runPipeline<ExampleReturnTypes>({
  first: {
    run: () => 1,
  },
  second: {
    run: () => 2,
  },
  sum: {
    deps: ['first', 'second'],
    run: ({ first, second }) => first + second,
  },
  even: {
    deps: ['sum'],
    run: ({ sum }) => sum % 2 === 0,
  },
  logEven: {
    deps: ['even'],
    if: ({ even }) => even,
    run: () => console.log('Even'),
  },
  logOdd: {
    deps: ['even'],
    if: ({ even }) => !even,
    run: () => console.log('Odd')
  }
})
```