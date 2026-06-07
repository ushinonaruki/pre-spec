import { buildPublicConfig, type PublicConfig } from '@/src/config/publicConfig'

export function getConfig(): PublicConfig {
  return buildPublicConfig()
}
