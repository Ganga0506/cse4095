let lastTimestamp = 0
let sequence = 0

export function createId(prefix = 'id'): string {
  const timestamp = Date.now()
  sequence = timestamp === lastTimestamp ? sequence + 1 : 0
  lastTimestamp = timestamp

  const randomPart = Math.random().toString(36).slice(2, 8)
  return `${prefix}-${timestamp.toString(36)}-${sequence.toString(36)}-${randomPart}`
}
