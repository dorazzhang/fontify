export function mockProcess(ms = 3400) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}
