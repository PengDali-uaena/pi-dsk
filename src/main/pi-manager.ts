import { spawn as nodeSpawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { PiCommand, PiEvent, PiResponse } from '../shared/protocol.js'
import { createJsonlDecoder } from './jsonl.js'

interface PendingRequest {
  resolve: (response: PiResponse) => void
  reject: (error: Error) => void
}

export interface PiManagerOptions {
  binary?: string
  args?: string[]
  cwd?: string
  env?: NodeJS.ProcessEnv
  /** 仅测试使用：替换 spawn。 */
  spawnFn?: typeof nodeSpawn
}

/** 由主进程持有的唯一 pi 子进程，负责 JSONL 收发与请求关联。 */
export class PiManager extends EventEmitter {
  private child: ChildProcessWithoutNullStreams | null = null
  private readonly pending = new Map<string, PendingRequest>()
  private nextId = 0
  private readonly binary: string
  private args: string[]
  private cwd: string
  private env: NodeJS.ProcessEnv
  private readonly spawnFn: typeof nodeSpawn
  private stderrTail = ''

  constructor(options: PiManagerOptions = {}) {
    super()
    this.binary = options.binary ?? resolvePiBinary()
    this.args = options.args ?? baseArgs()
    this.cwd = options.cwd ?? process.cwd()
    this.env = options.env ?? process.env
    this.spawnFn = options.spawnFn ?? nodeSpawn
  }

  /** 实际使用的 pi 可执行文件路径。 */
  get binaryPath(): string {
    return this.binary
  }

  /** pi 子进程的工作目录，也就是会话默认工作区。 */
  get workdir(): string {
    return this.cwd
  }

  get isRunning(): boolean {
    return this.child !== null
  }

  get lastStderr(): string {
    return this.stderrTail
  }

  start(): void {
    if (this.child) return
    const child = this.spawnFn(this.binary, this.args, {
      cwd: this.cwd,
      env: this.env,
      stdio: ['pipe', 'pipe', 'pipe']
    }) as ChildProcessWithoutNullStreams

    // 重启后旧子进程的残留输出不能影响新进程：所有回调都先比对身份。
    const isCurrent = (): boolean => this.child === child

    const decoder = createJsonlDecoder({
      onRecord: (record) => {
        if (isCurrent()) this.handleRecord(record)
      },
      onError: (error, line) => {
        if (isCurrent()) this.emit('warning', `无法解析的记录：${error.message} :: ${line.slice(0, 200)}`)
      }
    })

    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => decoder.push(chunk))
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', (chunk: string) => {
      if (!isCurrent()) return
      this.stderrTail = (this.stderrTail + chunk).slice(-4000)
    })
    child.on('exit', (code, signal) => {
      decoder.flush()
      if (!isCurrent()) return
      this.child = null
      const error = new Error(`pi 进程已退出（code=${code} signal=${signal}）`)
      for (const [, request] of this.pending) request.reject(error)
      this.pending.clear()
      this.emit('exit', { code, signal, stderr: this.stderrTail })
    })
    child.on('error', (error) => {
      if (isCurrent()) this.emit('warning', error.message)
    })

    this.child = child
    this.emit('started')
  }

  request(command: PiCommand): Promise<PiResponse> {
    if (!this.child) return Promise.reject(new Error('pi 进程未启动'))
    const id = String(++this.nextId)
    const payload = JSON.stringify({ ...command, id })
    return new Promise<PiResponse>((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.child!.stdin.write(payload + '\n')
    })
  }

  /** 写一条不属于 request/response 模型的原始记录（如 extension_ui_response）。 */
  sendRaw(record: Record<string, unknown>): boolean {
    if (!this.child) return false
    this.child.stdin.write(JSON.stringify(record) + '\n')
    return true
  }

  /** 换工作区或换会话：重启子进程（会话的 cwd 决定工具执行目录）。 */
  restart(options: { cwd?: string; sessionPath?: string }): void {
    this.dispose()
    if (options.cwd) this.cwd = options.cwd
    this.args = baseArgs(options.sessionPath)
    this.stderrTail = ''
    this.start()
  }

  dispose(): void {
    const child = this.child
    this.child = null
    for (const [, request] of this.pending) request.reject(new Error('pi 进程已关闭'))
    this.pending.clear()
    if (child) {
      child.stdin.end()
      child.kill()
    }
  }

  private handleRecord(record: any): void {
    if (record?.type === 'response') {
      const key = record.id === undefined ? undefined : String(record.id)
      const request = key === undefined ? undefined : this.pending.get(key)
      if (request && key !== undefined) {
        this.pending.delete(key)
        request.resolve(record as PiResponse)
      } else {
        this.emit('warning', `收到无法关联的响应：${JSON.stringify(record).slice(0, 200)}`)
      }
      return
    }
    this.emit('event', record as PiEvent)
  }
}

/**
 * 子进程参数。PI_DSK_PI_ARGS 可以追加额外参数（例如 -e 加载扩展），
 * 空格分隔；重启会话时保留。
 */
export function baseArgs(sessionPath?: string): string[] {
  const extra = (process.env.PI_DSK_PI_ARGS ?? '').split(' ').filter(Boolean)
  const args = ['--mode', 'rpc']
  if (sessionPath) args.push('--session', sessionPath)
  return [...args, ...extra]
}

/** pi 可执行文件：环境变量优先，其次安装目录，最后 PATH。 */
export function resolvePiBinary(): string {
  const fromEnv = process.env.PI_DSK_PI_BIN
  if (fromEnv) return fromEnv
  const installed = join(homedir(), '.pi', 'agent', 'bin', 'pi')
  if (existsSync(installed)) return installed
  return 'pi'
}
