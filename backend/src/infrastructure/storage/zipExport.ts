import archiver from 'archiver'
import type { WorkspaceExportFiles } from '@/src/domain/export/exportWorkspace'

export function buildExportZip(files: WorkspaceExportFiles): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } })
    const chunks: Buffer[] = []

    archive.on('data', (chunk: Buffer) => chunks.push(chunk))
    archive.on('end', () => resolve(Buffer.concat(chunks)))
    archive.on('error', reject)

    archive.append(files.globalReferences, { name: 'specs/references.md' })

    for (const feature of files.features) {
      archive.append(feature.spec, { name: `specs/${feature.slug}/spec.md` })
      archive.append(feature.references, { name: `specs/${feature.slug}/references.md` })
      archive.append(feature.timeline, { name: `specs/${feature.slug}/timeline.md` })
    }

    archive.finalize()
  })
}
