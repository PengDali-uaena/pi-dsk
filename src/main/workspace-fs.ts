import { readdir, readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'

export interface FileEntry {
  name: string
  path: string
  isDirectory: boolean
}

const MAX_PREVIEW_BYTES = 400_000

/** 列一层目录，跳过隐藏文件与 node_modules 这类噪音目录。 */
export async function listDirectory(path: string): Promise<FileEntry[]> {
  const entries = await readdir(path, { withFileTypes: true })
  return entries
    .filter((entry) => !entry.name.startsWith('.') && entry.name !== 'node_modules')
    .map((entry) => ({
      name: entry.name,
      path: join(path, entry.name),
      isDirectory: entry.isDirectory()
    }))
    .sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
      return a.name.localeCompare(b.name)
    })
}

export interface FilePreview {
  path: string
  text: string
  truncated: boolean
  binary: boolean
}

/** 读文本预览，超过 400KB 截断，二进制给出提示而不是乱码。 */
export async function readPreview(path: string): Promise<FilePreview> {
  const info = await stat(path)
  if (info.isDirectory()) throw new Error('这是一个目录')
  const buffer = await readFile(path)
  const slice = buffer.subarray(0, MAX_PREVIEW_BYTES)
  const binary = slice.includes(0)
  return {
    path,
    text: binary ? '' : slice.toString('utf8'),
    truncated: buffer.length > MAX_PREVIEW_BYTES,
    binary
  }
}
