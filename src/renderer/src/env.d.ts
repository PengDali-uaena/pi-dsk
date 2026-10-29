import type { PiApi } from '@shared/protocol'

declare global {
  interface Window {
    pi: PiApi
  }
}

export {}
