import type { ManualEdit, PhaseMarker, Question, SectionMarker, TimelineItem } from '@/types'

export type SectionBlock = {
  marker: SectionMarker
  questions: Question[]
}

export type PhaseBlock = {
  marker: PhaseMarker
  questions: Question[]
}

export type TimelineSlot =
  | { type: 'block'; id: string; data: SectionBlock }
  | { type: 'phase_block'; id: string; data: PhaseBlock }
  | { type: 'manual_edit'; id: string; data: ManualEdit }

export function buildTimelineSlots(timeline: TimelineItem[]): TimelineSlot[] {
  const slots: TimelineSlot[] = []
  let currentSection: SectionBlock | null = null
  let currentPhase: PhaseBlock | null = null

  const flushSection = () => {
    if (currentSection) {
      slots.push({ type: 'block', id: currentSection.marker.id, data: currentSection })
      currentSection = null
    }
  }
  const flushPhase = () => {
    if (currentPhase) {
      slots.push({ type: 'phase_block', id: currentPhase.marker.id, data: currentPhase })
      currentPhase = null
    }
  }

  for (const item of timeline) {
    if (item.type === 'phase_marker') {
      flushSection()
      flushPhase()
      currentPhase = { marker: item, questions: [] }
    } else if (item.type === 'section_marker') {
      flushPhase()
      flushSection()
      currentSection = { marker: item, questions: [] }
    } else if (item.type === 'question') {
      if (item.questionType === 'initial_confirmation') {
        if (currentPhase) currentPhase.questions.push(item)
      } else {
        if (currentSection) currentSection.questions.push(item)
      }
    } else if (item.type === 'manual_edit') {
      flushPhase()
      flushSection()
      slots.push({ type: 'manual_edit', id: item.id, data: item })
    }
  }
  flushPhase()
  flushSection()

  return slots.reverse().map((slot): TimelineSlot => {
    if (slot.type === 'block') {
      return { ...slot, data: { ...slot.data, questions: slot.data.questions.slice().reverse() } }
    }
    if (slot.type === 'phase_block') {
      return { ...slot, data: { ...slot.data, questions: slot.data.questions.slice().reverse() } }
    }
    return slot
  })
}
