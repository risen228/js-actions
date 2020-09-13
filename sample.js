const { runPipeline } = require('./dist/common')

runPipeline({
  actions: {
    1: {
      needs: ['2'],
      run: () => console.log(1),
    },
    2: {
      run: () => console.log(2),
    },
  },
})
