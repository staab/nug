import type {IReadable, Unsubscriber} from './store.ts'

export type Reference = Element | Comment

export interface Nug {
  render(element: Element, reference?: Reference): void
  destroy(): void
}

export type NugElementAttrs = Record<string, any>

export class NugElement implements Nug {
  children: Nug[] = []
  element: Element | undefined

  constructor(readonly tag: string, readonly attrs: NugElementAttrs) {
    this.element = document.createElement(this.tag)
  }

  static define(tag: string) {
    return (attrs: NugElementAttrs = {}) => new NugElement(tag, attrs)
  }

  append(child: Nug) {
    this.children.push(child)

    return this
  }

  render(element: Element, reference?: Reference) {
    this.element = document.createElement(this.tag)

    for (const [k, v] of Object.entries(this.attrs)) {
      if (typeof v === 'function') {
        this.element.addEventListener(k, v)
      } else {
        this.element.setAttribute(k, v)
      }
    }

    for (const child of this.children) {
      child.render(this.element)
    }

    if (reference) {
      element.insertBefore(this.element, reference)
    } else {
      element.appendChild(this.element)
    }
  }

  destroy() {
    this.element?.remove()

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
  }

  destroy() {}
}

export class NugUnsafe implements Nug {
  constructor(private html: string) {}

  render(element: Element) {
    element.textContent = this.html
  }

  destroy() {}
}

export type ComponentOptions<P extends ComponentProps> = {
  render: (props: P) => Nug[]
  watch?: (props: P) => IReadable<any>[]
}

export type ComponentProps = Record<string, any>

export type ComponentFactory<P extends ComponentProps> = (props: P) => NugComponent<P>

export class NugComponent<P extends ComponentProps> implements Nug {
  protected subs: Unsubscriber[] = []
  protected placeholder = document.createComment("nug placeholder")
  protected container: Element | undefined
  protected elements: Element[] = []
  protected children: Nug[] = []

  constructor(private options: ComponentOptions<P>, private props: P) {}

  static define<P extends ComponentProps>(options: ComponentOptions<P>) {
    return (props: P) => new NugComponent(options, props)
  }

  private update = () => {
    this.children.splice(0).forEach(child => child.destroy())

    for (const child of this.options.render(this.props)) {
      this.children.push(child)

      child.render(this.container!, this.placeholder)
    }
  }

  render(element: Element, reference?: Reference) {
    this.container = element
    this.container.appendChild(this.placeholder)

    if (reference) {
      this.container.insertBefore(this.placeholder, reference)
    } else {
      this.container.appendChild(this.placeholder)
    }

    for (const v of Object.values(this.props)) {
      if (v.subscribe) {
        this.subs.push(v.subscribe(this.update, {initial: false}))
      }
    }

    if (this.options.watch) {
      for (const v of this.options.watch(this.props)) {
        this.subs.push(v.subscribe(this.update, {initial: false}))
      }
    }

    this.update()
  }

  destroy() {
    this.placeholder.remove()

    for (const child of this.children) {
      child.destroy()
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
