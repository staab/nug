export type Subscriber<T> = (value: T) => void

export type Unsubscriber = () => void

export type Updater<T> = (value: T) => T

export interface IReadable<T> {
	subscribe(run: Subscriber<T>): Unsubscriber
}

export interface IWritable<T> extends IReadable<T> {
	set(value: T): void
	update(updater: Updater<T>): void
}

export type Stores = Array<IReadable<any>>

export type StoresValues<T> = T extends IReadable<infer U>
	? U
	: { [K in keyof T]: T[K] extends IReadable<infer U> ? U : never };

export type UnwrapStore<T> = T extends IReadable<infer U> ? U : T

export class Readable<T> implements IReadable<T> {
  protected subs: Subscriber<T>[] = []

  constructor(protected value: T) {}

  subscribe(cb: Subscriber<T>) {
    this.subs.push(cb)

    cb(this.value)

    return () => {
      this.subs = this.subs.filter(s => s !== cb)
    }
  }
}

export const readable = <T>(value: T) => new Readable(value)

export class Writable<T> extends Readable<T> {
  set(value: T) {
    this.value = value

    for (const cb of this.subs) {
      cb(this.value)
    }
  }

  update(cb: Updater<T>) {
    this.set(cb(this.value))
  }
}

export const writable = <T>(value: T) => new Writable(value)

export class Derived<S extends Stores, T> implements IReadable<T> {
  private subs: Subscriber<T>[] = []
  private unsubscribers: Unsubscriber[] = []
  private storesValues: StoresValues<S>
  private value: T

  constructor(stores: S, cb: (values: StoresValues<S>) => T) {
    const initialStoresValues: any[] = []

    for (let i = 0; i < stores.length; i++) {
      const store = stores[i]

      this.unsubscribers.push(
        store.subscribe(v => {
          if (this.storesValues) {
            this.storesValues[i] = v
            this.value = cb(this.storesValues)

            for (const sub of this.subs) {
              sub(this.value)
            }
          } else {
            initialStoresValues.push(v)
          }
        })
      )
    }

    this.storesValues = initialStoresValues as StoresValues<S>
    this.value = cb(this.storesValues)
  }

  subscribe(cb: Subscriber<T>) {
    this.subs.push(cb)

    cb(this.value)

    return () => {
      this.subs = this.subs.filter(s => s !== cb)
    }
  }

  destroy() {
    for (const unsub of this.unsubscribers) {
      unsub()
    }
  }
}

export const derived = <S extends Stores, T>(stores: S, cb: (values: StoresValues<S>) => T) =>
  new Derived(stores, cb)

export const get = <T>(store: IReadable<T>) => {
  let value: any = undefined

  const unsub = store.subscribe(v => {
    value = v
  })

  unsub()

  return value as T
}
