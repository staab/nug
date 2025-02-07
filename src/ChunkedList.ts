import type {IWritable, IReadable, Subscriber, Unsubscriber} from './store.ts'
import {writable} from './store.ts'
import type {ComponentFactory} from './core.ts'
import {component} from './core.ts'


export type Chunk<T> = IReadable<T[]>

export type Chunks<T> = IReadable<Chunk<T>[]>

export const deriveChunks = <T>({
  store,
  getKey,
  chunkSize,
}: {
  chunkSize: number,
  store: IReadable<T[]>,
  getKey: (item: T) => string | number,
}): Chunks<T> => {
  let subscribers: Subscriber<IReadable<T[]>[]>[] = []
  let unsubscribe: Unsubscriber | undefined
  let chunkStores: IWritable<T[]>[] = []
  let chunks: T[][] = []

  return {
    subscribe(run: Subscriber<IReadable<T[]>[]>) {
      subscribers.push(run)

      if (!unsubscribe) {
        unsubscribe = store.subscribe(items => {
          const maxChunks = Math.ceil(items.length / chunkSize)

          let dirty = false

          if (chunks.length > maxChunks) {
            chunks = chunks.slice(0, maxChunks)
            chunkStores = chunkStores.slice(0, maxChunks)
            dirty = true
          }

          for (let chunkIndex = 0; chunkIndex < maxChunks; chunkIndex++) {
            let chunk = chunks[chunkIndex]
            let chunkStore = chunkStores[chunkIndex]
            let chunkIsDirty = false

            if (!chunk) {
              chunk = []
              chunkStore = writable(chunk)
              chunks.push(chunk)
              chunkStores.push(chunkStore)
              dirty = true
            }

            const offset = chunkIndex * chunkSize

            if (chunk.length > items.length - offset) {
              chunk = chunk.slice(0, items.length - offset)
              chunkIsDirty = true
            }

            for (let i = 0; i < chunkSize; i++) {
              const itemIndex = i + offset

              if (!(itemIndex in items) && !(i in chunk)) {
                break
              }

              if (getKey(items[itemIndex]) !== getKey(chunk[i])) {
                chunk[i] = items[itemIndex]
                chunkIsDirty = true
              }
            }

            if (chunkIsDirty) {
              chunkStore.set(chunk)
            }
          }

          if (dirty || !unsubscribe) {
            for (const subscriber of subscribers) {
              subscriber(chunkStores)
            }
          }
        })
      } else {
        run(chunkStores)
      }

      return () => {
        subscribers = subscribers.filter(s => s !== run)

        if (subscribers.length === 0) {
          unsubscribe?.()
          unsubscribe = undefined
        }
      }
    }
  }
}

export type ChunkedListProps = {
  chunks: Chunks<any>
  component: ComponentFactory<{item: any}>
}

export const ChunkedList = component<ChunkedListProps>({
  render({chunks, component}) {
    return chunks.map(chunk => ChunkedListChunk({chunk, component}))
  }
})

export type ChunkedListChunkProps = {
  chunk: Chunk<any>
  component: ComponentFactory<{item: any}>
}

export const ChunkedListChunk = component<ChunkedListChunkProps>({
  render({chunk, component}) {
    return chunk.map(item => component({item}))
  }
})
