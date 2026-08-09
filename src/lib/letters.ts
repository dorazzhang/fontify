export const PANGRAM = 'The quick brown fox jumps over the lazy dog.'

export const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'] as const

export const SYMBOLS = ['!', '?', '#', '$', '&', '@'] as const

/** A, a, B, b, … Z, z */
export function buildLetterSteps(): string[] {
  const steps: string[] = []
  for (let i = 0; i < 26; i++) {
    const upper = String.fromCharCode(65 + i)
    const lower = String.fromCharCode(97 + i)
    steps.push(upper, lower)
  }
  return steps
}

export const LETTER_STEPS = buildLetterSteps()

export const SENTENCE_STEP_ID = 'pangram'

export type CaptureStep =
  | { id: string; kind: 'glyph'; label: string }
  | { id: typeof SENTENCE_STEP_ID; kind: 'sentence'; label: string }

export function buildCaptureSteps(): CaptureStep[] {
  return [
    ...LETTER_STEPS.map((label) => ({
      id: `letter-${label}`,
      kind: 'glyph' as const,
      label,
    })),
    ...DIGITS.map((label) => ({
      id: `digit-${label}`,
      kind: 'glyph' as const,
      label,
    })),
    ...SYMBOLS.map((label) => ({
      id: `symbol-${label}`,
      kind: 'glyph' as const,
      label,
    })),
    {
      id: SENTENCE_STEP_ID,
      kind: 'sentence' as const,
      label: PANGRAM,
    },
  ]
}
