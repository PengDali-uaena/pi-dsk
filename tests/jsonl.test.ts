import { describe, expect, it } from 'vitest'
import { createJsonlDecoder } from '../src/main/jsonl'

function collect() {
  const records: any[] = []
  const errors: string[] = []
  const decoder = createJsonlDecoder({
    onRecord: (record) => records.push(record),
    onError: (_error, line) => errors.push(line)
  })
  return { records, errors, decoder }
}

describe('createJsonlDecoder', () => {
  it('跨 chunk 的半行', () => {
    const { records, decoder } = collect()
    decoder.push('{"type":"a"')
    expect(records).toHaveLength(0)
    decoder.push(',"value":1}\n')
    expect(records).toEqual([{ type: 'a', value: 1 }])
  })

  it('一个 chunk 多行', () => {
    const { records, decoder } = collect()
    decoder.push('{"type":"a"}\n{"type":"b"}\n')
    expect(records).toEqual([{ type: 'a' }, { type: 'b' }])
  })

  it('CRLF 与空行', () => {
    const { records, decoder } = collect()
    decoder.push('{"type":"a"}\r\n\n{"type":"b"}\r\n')
    expect(records).toEqual([{ type: 'a' }, { type: 'b' }])
  })

  it('非法 JSON 走 onError 且不影响后续', () => {
    const { records, errors, decoder } = collect()
    decoder.push('not json\n{"type":"b"}\n')
    expect(errors).toHaveLength(1)
    expect(records).toEqual([{ type: 'b' }])
  })

  it('flush 处理没有换行结尾的最后一行', () => {
    const { records, decoder } = collect()
    decoder.push('{"type":"last"}')
    expect(records).toHaveLength(0)
    decoder.flush()
    expect(records).toEqual([{ type: 'last' }])
  })
})
