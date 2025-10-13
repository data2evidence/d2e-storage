import { AsyncLocalStorage } from 'async_hooks'
import { KvStore } from '@tus/server'
// import { MetadataValue } from '@tus/s3-store'

export class AlsMemoryKV implements KvStore<any> {
  static localStorage = new AsyncLocalStorage<Map<string, any>>()

  async delete(value: string): Promise<void> {
    AlsMemoryKV.localStorage.getStore()?.delete(value)
  }

  async get(value: string): Promise<any | undefined> {
    return AlsMemoryKV.localStorage.getStore()?.get(value)
  }

  async set(key: string, value: any): Promise<void> {
    AlsMemoryKV.localStorage.getStore()?.set(key, value)
  }
}
