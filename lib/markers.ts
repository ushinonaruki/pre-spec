export type MarkerDefinition = {
  id: string
  label: string
  inlinePattern: RegExp
  rangePattern?: RegExp
  warningMessage: string
}

export const EXTENSIBLE_MARKERS: MarkerDefinition[] = [
  {
    id: 'revisit',
    label: 'revisit marker',
    inlinePattern: /\[pre-spec:revisit\]/g,
    rangePattern: /<!--\s*pre-spec:revisit:start\s*-->/g,
    warningMessage: 'revisit marker が残っています。再確認対象を含む spec.md として出力されます。',
  },
  {
    id: 'protected',
    label: 'protected marker',
    inlinePattern: /\[pre-spec:protected\]/g,
    rangePattern: /<!--\s*pre-spec:protected:start\s*-->/g,
    warningMessage: 'protected marker が残っています。保護された内容を含む spec.md として出力されます。',
  },
]
