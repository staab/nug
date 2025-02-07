// Utils

export const ensurePlural = <T>(x: T | T[]) => (x instanceof Array ? x : [x])

// Nug

export type NugAttrs = Record<string, any>

export interface Nug {
  render(element: Element): Element[]
  destroy(): void
}

export class NugElement implements Nug {
  children: Nug[] = []

  constructor(readonly tag: string, readonly attrs: NugAttrs) {}

  static define(tag: string) {
    return (attrs: NugAttrs = {}) => new NugElement(tag, attrs)
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

export class NugComponent implements Nug {
  constructor(private component: Component) {}

  render(element: Element) {
    return this.component.mount(element)
  }

  destroy() {
    this.component.destroy()
  }
}

export const div = NugElement.define('div')

export const span = NugElement.define('span')

export const button = NugElement.define('button')

export const text = (t: any) => new NugText(t.toString())

export const unsafe = (t: any) => new NugUnsafe(t.toString())

export const component = (component: Component) => new NugComponent(component)

export const render = (element: Element, nugs: Nug[]) => nugs.flatMap(nug => nug.render(element))

// Stores

export type Subscriber<T> = (value: T) => void

export type Updater<T> = (value: T) => T

export type Unsubscriber = () => void

export type SubscribeOptions = {
  initial?: boolean
}

export class Store<T> {
  private subs: Subscriber<T>[] = []

  constructor(private value: T) {}

  get() {
    return this.value
  }

  set(value: T) {
    this.value = value

    for (const cb of this.subs) {
      cb(this.value)
    }
  }

  update(cb: Updater<T>) {
    this.set(cb(this.value))
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

// Component

export type ComponentProps = Record<string, any>

export class Component<P extends ComponentProps = ComponentProps> {
  protected element: Element | undefined
  protected subs: Unsubscriber[] = []
  protected nugs: Nug[] = []
  protected elements: Element[] = []
  declare protected watch: Store<any>[] | undefined

  constructor(protected props: P) {}

  mount(element: Element) {
    this.element = element

    for (const v of Object.values(this.props)) {
      if (v instanceof Store) {
        this.subs.push(v.subscribe(this.update, {initial: false}))
      }
    }

    for (const v of this.watch || []) {
      this.subs.push(v.subscribe(this.update, {initial: false}))
    }

    return this.update()
  }

  update = () => {
    if (!this.element) {
      throw new Error(`${this.constructor.name} updated before it was mounted`)
    }

    for (const nug of this.nugs) {
      nug.destroy()
    }

    for (const element of this.elements) {
      element.remove()
    }

    console.log('update', this.constructor.name)

    this.nugs = ensurePlural(this.render())
    this.elements = render(this.element, this.nugs)

    return this.elements
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

  render(): Nug[] {
    return []
  }
}
