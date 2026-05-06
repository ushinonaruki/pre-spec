import type { AppState, Project } from '@/types'

const KEY = 'pre-spec-v1'

const DEFAULT_STATE: AppState = {
  apiKey: null,
  project: null,
  uiState: {
    activeTab: 'spec',
    activeHeadingId: null,
  },
}

export function loadState(): AppState {
  if (typeof window === 'undefined') return DEFAULT_STATE
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_STATE
    return { ...DEFAULT_STATE, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_STATE
  }
}

export function saveState(state: AppState): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(state))
}

export function saveProject(project: Project): void {
  const state = loadState()
  saveState({ ...state, project: { ...project, updatedAt: new Date().toISOString() } })
}

export function resetProject(): void {
  const state = loadState()
  saveState({ ...state, project: null, uiState: { activeTab: 'spec', activeHeadingId: null } })
}

export function saveApiKey(key: string): void {
  const state = loadState()
  saveState({ ...state, apiKey: key })
}
