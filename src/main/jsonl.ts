export interface JsonlDecoderOptions {
  onRecord: (record: any) => void
  onError?: (error: Error, rawLine: string) => void
}

export interface JsonlDecoder {
  push: (chunk: string | Buffer) => void
  flush: () => void
}

/**
 * 严格 JSONL 分帧：只按 LF 切分，容忍 CRLF 与跨 chunk 半行。
 * 非法 JSON 交给 onError，不影响后续记录。
 */
export function createJsonlDecoder(options: JsonlDecoderOptions): JsonlDecoder {
  let buffer = ''

  const handleLine = (raw: string): void => {
    let line = raw
    if (line.endsWith('\r')) line = line.slice(0, -1)
    if (line.trim() === '') return
    try {
      options.onRecord(JSON.parse(line))
    } catch (error) {
      options.onError?.(error as Error, line)
    }
  }

  return {
    push(chunk) {
      buffer += typeof chunk === 'string' ? chunk : chunk.toString('utf8')
      let index = buffer.indexOf('\n')
      while (index >= 0) {
        handleLine(buffer.slice(0, index))
        buffer = buffer.slice(index + 1)
        index = buffer.indexOf('\n')
      }
    },
    flush() {
      if (buffer.length > 0) {
        handleLine(buffer)
        buffer = ''
      }
    }
  }
}
