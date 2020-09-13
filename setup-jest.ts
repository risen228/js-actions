expect.extend({
  toEqualNoOrder: (array: unknown[], expectedItems: unknown[]) => {
    const set = new Set(array)

    return {
      message: () => 'expected that array will contain expected items',
      pass:
        set.size === expectedItems.length &&
        expectedItems.every((item) => set.has(item)),
    }
  },
})

// isolated modules fix
export {}