// Utils

export const ensurePlural = <T>(x: T | T[]) => (x instanceof Array ? x : [x])

// Stores

export type Subscriber<T> = (value: T) => void

export type Unsubscriber = () => void

export type Updater<T> = (value: T) => T

export type SubscribeOptions = {
  initial?: boolean
}

export interface IReadable<T> {
	get(): T
	subscribe(run: Subscriber<T>, options: SubscribeOptions): Unsubscriber
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

export const readable = <T>(value: T | undefined) => new Readable(value)

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

export const writable = <T>(value: T | undefined) => new Writable(value)

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

// Nug

export interface Nug {
  render(element: Element): Element[]
  destroy(): void
}

export type NugElementAttrs = Record<string, any>

export class NugElement implements Nug {
  children: Nug[] = []

  constructor(readonly tag: string, readonly attrs: NugElementAttrs) {}

  static define(tag: string) {
    return (attrs: NugElementAttrs = {}) => new NugElement(tag, attrs)
  }

  append(child: Nug) {
    this.children.push(child)

    return this
  }

  render(element: Element) {
    const el = document.createElement(this.tag)

    for (const [k, v] of Object.entries(this.attrs)) {
      if (typeof v === 'function') {
        (el as any)[k] = v
      } else {
        el.setAttribute(k, v)
      }
    }

    for (const child of this.children) {
      child.render(el)
    }

    element.appendChild(el)

    return [el]
  }

  destroy() {
    for (const child of this.children) {
      child.destroy()
    }
  }
}

export class NugText implements Nug {
  constructor(private text: string) {}

  render(element: Element) {
    const temp = document.createElement("div")

    temp.innerText = this.text

    element.textContent += temp.innerHTML

    return []
  }

  destroy() {}
}

export class NugUnsafe implements Nug {
  constructor(private html: string) {}

  render(element: Element) {
    element.textContent = this.html

    return []
  }

  destroy() {}
}

export type ComponentOptions<P extends ComponentProps> = {
  render: (props: P) => Nug[]
  watch?: Readable<any>[]
}

export type ComponentProps = Record<string, any>

export class NugComponent<P extends ComponentProps> implements Nug {
  protected subs: Unsubscriber[] = []
  protected container: Element | undefined
  protected elements: Element[] = []
  protected nugs: Nug[] = []

  constructor(private options: ComponentOptions<P>, private props: P) {}

  static define<P extends ComponentProps>(options: ComponentOptions<P>) {
    return (props: P) => new NugComponent(options, props)
  }

  private update = () => {
    this.nugs.splice(0).forEach(nug => nug.destroy())
    this.elements.splice(0).forEach(element => element.remove())

    for (const nug of ensurePlural(this.options.render(this.props))) {
      this.nugs.push(nug)

      for (const element of nug.render(this.container!)) {
        this.elements.push(element)
      }
    }

    return this.elements
  }

  render(element: Element) {
    this.container = element

    for (const v of Object.values(this.props)) {
      if (v.subscribe) {
        this.subs.push(v.subscribe(this.update, {initial: false}))
      }
    }

    for (const v of this.options.watch || []) {
      this.subs.push(v.subscribe(this.update, {initial: false}))
    }

    return this.update()
  }

  destroy() {
    for (const element of this.elements) {
      element.remove()
    }

    for (const nug of this.nugs) {
      nug.destroy()
    }

    for (const cb of this.subs) {
      cb()
    }
  }
}

export const div = NugElement.define('div')

export const span = NugElement.define('span')

export const button = NugElement.define('button')

export const text = (t: any) => new NugText(t.toString())

export const unsafe = (t: any) => new NugUnsafe(t.toString())

export const component = <P extends ComponentProps>(options: ComponentOptions<P>) =>
  NugComponent.define(options)
