import type {Unsubscriber, UnwrapStore} from './store.ts'

export type Reference = Element | Comment

export interface Nug {
  mount(element: Element, reference?: Reference): void
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

  mount(element: Element, reference?: Reference) {
    this.element = document.createElement(this.tag)

    for (const [k, v] of Object.entries(this.attrs)) {
      if (typeof v === 'function') {
        this.element.addEventListener(k, v)
      } else {
        this.element.setAttribute(k, v)
      }
    }

    for (const child of this.children) {
      child.mount(this.element)
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

  mount(element: Element) {
    const temp = document.createElement("div")

    temp.innerText = this.text

    element.textContent += temp.innerHTML
  }

  destroy() {}
}

export class NugUnsafe implements Nug {
  constructor(private html: string) {}

  mount(element: Element) {
    element.textContent = this.html
  }

  destroy() {}
}

export type ComponentProps = Record<string, any>

export type UnwrapStoreProps<Props> = {
  [K in keyof Props]: UnwrapStore<Props[K]>
}

export type ComponentOptions<Props extends ComponentProps = ComponentProps> = {
  render: (props: UnwrapStoreProps<Props>) => Nug[]
  addProps?: (props: Props) => Props
}

export type ComponentFactory<Props extends ComponentProps = ComponentProps> =
  (props: Props) => NugComponent<Props>

export class NugComponent<Props extends ComponentProps = ComponentProps> implements Nug {
  protected subs: Unsubscriber[] = []
  protected placeholder = document.createComment("nug placeholder")
  protected container: Element | undefined
  protected elements: Element[] = []
  protected children: Nug[] = []

  constructor(private options: ComponentOptions<Props>, private props: Props) {}

  static define<Props extends ComponentProps = ComponentProps>(options: ComponentOptions<Props>) {
    return (props: Props) => new NugComponent(options, props)
  }

  private update = (data: Props) => {
    this.children.splice(0).forEach(child => child.destroy())

    for (const child of this.options.render(data)) {
      this.children.push(child)

      child.mount(this.container!, this.placeholder)
    }
  }

  mount(element: Element, reference?: Reference) {
    let initialized = false
    const data: any = {}
    const props = this.options.addProps?.(this.props) || this.props

    this.container = element
    this.container.appendChild(this.placeholder)

    if (reference) {
      this.container.insertBefore(this.placeholder, reference)
    } else {
      this.container.appendChild(this.placeholder)
    }

    for (const [k, prop] of Object.entries(props)) {
      if (prop.subscribe) {
        this.subs.push(
          prop.subscribe((value: any) => {
            data[k] = value

            if (initialized) {
              this.update(data as Props)
            }
          })
        )
      } else {
        data[k] = prop
      }
    }

    initialized = true
    this.update(data)
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

export const anchor = NugElement.define('a')

export const text = (t: any) => new NugText(t.toString())

export const unsafe = (t: any) => new NugUnsafe(t.toString())

export const component = <Props extends ComponentProps = ComponentProps>(
  options: ComponentOptions<Props>
) => NugComponent.define(options)
