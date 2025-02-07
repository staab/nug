import type {IWritable, IReadable} from './store.ts'
import {get, writable} from './store.ts'
import type {ComponentFactory} from './core.ts'
import {component} from './core.ts'

export type Chunk<T> = IWritable<T[]>

export type Chunks<T> = IWritable<Chunk<T>[]>

export const deriveChunks = <T>({
  store,
  getKey,
  chunkSize,
}: {
  chunkSize: number,
  store: IReadable<T[]>,
  getKey: (item: T) => string | number,
}) => {
  const chunks: Chunks<T> = writable<IWritable<T[]>[]>([])

  store.subscribe(items => {
    const chunksCopy = [...get(chunks)]

    let shouldUpdateChunks = false
    for (let itemIndex = 0; itemIndex < items.length; itemIndex += chunkSize) {
      const chunkIndex = itemIndex / chunkSize
      const chunk = chunksCopy[chunkIndex]

      // If we're adding a chunk, we need to re-mount everything
      if (!chunk) {
        shouldUpdateChunks = true
        chunksCopy.push(writable(items.slice(itemIndex, itemIndex + chunkSize)))
        continue
      }

      // If some item within this chunk has changed, invalidate just this chunk
      for (let i = 0; i < chunkSize; i += 1) {
        if (getKey(items[itemIndex + i]) !== getKey(get(chunk)[i])) {
          chunk.set(items.slice(itemIndex, itemIndex + chunkSize))
          break
        }
      }
    }

    if (shouldUpdateChunks) {
      chunks.set(chunksCopy)
    }
  })

  return chunks
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
