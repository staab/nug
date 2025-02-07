export type Subscriber<T> = (value: T) => void

export type Unsubscriber = () => void

export type Updater<T> = (value: T) => T

export type SubscribeOptions = {
  initial?: boolean
}

export interface IReadable<T> {
	get(): T
	subscribe(run: Subscriber<T>, options?: SubscribeOptions): Unsubscriber
}

export interface IWritable<T> extends IReadable<T> {
	set(value: T): void
	update(updater: Updater<T>): void
}

export type Stores = Array<IReadable<any>>

export type StoresValues<T> = T extends IReadable<infer U>
	? U
	: { [K in keyof T]: T[K] extends IReadable<infer U> ? U : never };

export class Readable<T> implements IReadable<T> {
  protected subs: Subscriber<T>[] = []

  constructor(protected value: T) {}

  get() {
    return this.value
  }

  subscribe(cb: Subscriber<T>, {initial = true}: SubscribeOptions = {}) {
    this.subs.push(cb)

    if (initial) {
      cb(this.value)
    }

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
  private value: T

  constructor(stores: S, cb: (values: StoresValues<S>) => T) {
    const getStoresValues = () => stores.map(s => s.get()) as StoresValues<S>

    this.value = cb(getStoresValues())

    for (const store of stores) {
      this.unsubscribers.push(
        store.subscribe(() => {
          this.value = cb(getStoresValues())

          for (const sub of this.subs) {
            sub(this.value)
          }
        }, {
          initial: false,
        })
      )
    }
  }

  get() {
    return this.value
  }

  subscribe(cb: Subscriber<T>, {initial = true}: SubscribeOptions = {}) {
    this.subs.push(cb)

    if (initial) {
      cb(this.value)
    }

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
