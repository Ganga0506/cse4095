export function randomInt(min: number, max: number): number {
  if (!Number.isInteger(min) || !Number.isInteger(max) || min > max) {
    throw new Error(
      'randomInt requires integer bounds where min is less than or equal to max.',
    )
  }

  return Math.floor(Math.random() * (max - min + 1)) + min
}
