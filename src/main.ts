// Nug

export type NugAttrs = Record<string, any>

export class Nug {
  children: NugChild[] = []

  constructor(readonly tag: string, readonly attrs: NugAttrs) {}

  static defineElement(tag: string) {
    return (attrs: NugAttrs = {}) => new Nug(tag, attrs)
  }

  static render(nugs: Nug[]) {
    return nugs.map(nug => nug.render())
  }

  append(child: NugChild) {
    this.children.push(child)

    return this
  }

  render() {
    const element = document.createElement(this.tag)

    for (const [k, v] of Object.entries(this.attrs)) {
      if (typeof v === 'function') {
        (element as any)[k] = v
      } else {
        element.setAttribute(k, v)
      }
    }

    let textContent: string[] = []

    for (const child of this.children) {
      const rendered = child.render()

      if (typeof rendered === 'string') {
        textContent.push(rendered)
      } else if (textContent.length > 0) {
        console.error("Unable to mix text and elements", this.children)
      } else {
        element.appendChild(rendered)
      }
    }

    if (textContent.length > 0) {
      element.textContent = textContent.join(' ')
    }

    return element
  }
}

export class NugText {
  constructor(private text: string) {}

  render() {
    const element = document.createElement("div")

    element.innerText = this.text

    return element.innerHTML
  }
}

export class NugUnsafe {

  constructor(private html: string) {}

  render() {
    return this.html
  }
}

export type NugChild = Nug | NugText | NugUnsafe

export const div = Nug.defineElement('div')

export const span = Nug.defineElement('span')

export const button = Nug.defineElement('button')

export const text = (t: any) => new NugText(t.toString())

export const unsafe = (t: any) => new NugUnsafe(t.toString())

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

export class Component<P extends ComponentProps> {
  protected element: Element | undefined
  protected subs: Unsubscriber[] = []

  constructor(protected props: P) {}

  mount(element: Element) {
    this.element = element

    for (const v of Object.values(this.props)) {
      if (v instanceof Store) {
        this.subs.push(v.subscribe(this.update, {initial: false}))
      }
    }

    this.update()
  }

  destroy() {
    for (const cb of this.subs) {
      cb()
    }
  }

  update = () => {
    if (!this.element) {
      throw new Error(`${this.constructor.name} updated before it was mounted`)
    }

    let nugs = this.render()

    if (!Array.isArray(nugs)) {
      nugs = [nugs]
    }

    this.element.innerHTML = ''

    for (const child of Nug.render(nugs)) {
      this.element.appendChild(child)
    }
  }

  render(): Nug | Nug[] {
    return []
  }
}

// Application

export type MountState = Record<string, Store<any>>

export const mount = <P extends ComponentProps, S extends MountState>(element: Element, component: Component<P>, state: S) => {
  const subs: Unsubscriber[] = []

  for (const v of Object.values(state)) {
    if (v instanceof Store) {
      subs.push(v.subscribe(component.update, {initial: false}))
    }
  }

  component.mount(element)

  return () => {
    for (const cb of subs) {
      cb()
    }
  }
}

