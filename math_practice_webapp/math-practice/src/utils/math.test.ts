import { afterEach, describe, expect, it, vi } from 'vitest'

import { createId } from './ids'
import { randomInt } from './math'
import { shuffle } from './shuffle'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('randomInt', () => {
  it('returns values at the inclusive minimum and maximum bounds', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0.999999)

    expect(randomInt(3, 8)).toBe(3)
    expect(randomInt(3, 8)).toBe(8)
  })

  it('rejects invalid bounds', () => {
    expect(() => randomInt(4, 3)).toThrow(/integer bounds/i)
    expect(() => randomInt(1.5, 3)).toThrow(/integer bounds/i)
  })
})

describe('shuffle', () => {
  it('returns the same values in a new array', () => {
    const original = [1, 2, 3, 4]
    const shuffled = shuffle(original)

    expect(shuffled).not.toBe(original)
    expect(shuffled.sort()).toEqual(original)
    expect(original).toEqual([1, 2, 3, 4])
  })
})

describe('createId', () => {
  it('creates unique IDs with the supplied prefix', () => {
    vi.spyOn(Date, 'now').mockReturnValue(100)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)

    const firstId = createId('question')
    const secondId = createId('question')

    expect(firstId).toMatch(/^question-/)
    expect(secondId).toMatch(/^question-/)
    expect(firstId).not.toBe(secondId)
  })
})
