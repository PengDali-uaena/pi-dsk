#!/usr/bin/env node
// npm 解包 node-pty prebuild 时会丢掉 spawn-helper 的可执行位，导致 posix_spawnp failed。
import { chmodSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const base = 'node_modules/node-pty/prebuilds'
if (!existsSync(base)) process.exit(0)

for (const target of readdirSync(base)) {
  const helper = join(base, target, 'spawn-helper')
  if (!existsSync(helper)) continue
  try {
    chmodSync(helper, 0o755)
    console.log(`[pi-dsk] chmod +x ${helper}`)
  } catch (error) {
    console.warn(`[pi-dsk] 无法修复 ${helper}: ${error.message}`)
  }
}
