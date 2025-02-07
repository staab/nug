import {div, button, span, anchor, text, writable, derived, deriveChunks, component, ChunkedList} from './index.ts'

const count = writable(0)

const items = derived([count], ([$count]) => {
  const $items = []

  for (let i = 0; i < $count; i++) {
    $items.push(i)
  }

  return $items
})

const chunks = deriveChunks({
  chunkSize: 5,
  store: items,
  getKey: x => x,
})

const incrementCount = () => count.update(c => c + 1)

type CounterButtonProps = {
  buttonText: string
}

const CounterButton = component<CounterButtonProps>({
  render({buttonText}) {
    return [
      button({click: incrementCount, class: 'btn btn-primary'})
        .append(text(buttonText))
    ]
  },
})

const CounterDisplay = component({
  watch() {
    return [count]
  },
  render() {
    const n = count.get()
    const word = n === 1 ? 'time' : 'times'

    return [
      span({class: 'text-center inline-block opacity-50'})
        .append(text(`You have clicked ${n} ${word}`)),
    ]
  },
})

type CounterItemProps = {
  item: number
}

const CounterItem = component<CounterItemProps>({
  render({item}) {
    return [div().append(text(`Item #${item}`))]
  },
})

type CounterProps = {
  buttonText: string
}

const Counter = component<CounterProps>({
  render({buttonText}) {
    return [
      div({class: 'p-12 rounded-xl bg-base-100 text-base-content flex flex-col gap-2 min-h-96 w-96'})
        .append(CounterButton({buttonText}))
        .append(CounterDisplay({}))
        .append(
          div({class: 'flex flex-wrap gap-1'})
            .append(ChunkedList({chunks, component: CounterItem}))
        )
    ]
  },
})

const Application = component({
  render() {
    return [
      div({class: 'bg-base-300 h-screen inset-0 flex justify-center items-center flex-col gap-2'})
        .append(Counter({buttonText: "Click me!"}))
        .append(
          anchor({class: "opacity-50 underline", href: "https://github.com/staab/nug"})
            .append(text("Powered by nug"))
        ),
    ]
  },
})

Application({}).render(document.querySelector('#app')!)
