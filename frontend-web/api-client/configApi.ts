import { apiGet } from './backendUrl'
import type { PublicConfig } from '@/workbench/workbenchState'

export async function fetchConfig(): Promise<PublicConfig> {
  return apiGet<PublicConfig>('/api/config')
}
