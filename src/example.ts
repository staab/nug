import {div, button, span, anchor, text, writable, derived, deriveChunks, component, ChunkedList} from './index.ts'


const items = writable<string[]>([])

const count = derived([items], ([$items]) => $items.length)

const chunks = deriveChunks({
  chunkSize: 5,
  store: items,
  getKey: x => x,
})

const addItem = () => items.update($items => [...$items, Math.random().toString().slice(2, 6)])

type CounterButtonProps = {
  buttonText: string
}

const CounterButton = component<CounterButtonProps>({
  render({buttonText}) {
    return [
      button({click: addItem, class: 'btn btn-primary'})
        .append(text(buttonText))
    ]
  },
})

const CounterDisplay = component({
  addProps(props) {
    return {...props, count}
  },
  render({count}) {
    const word = count === 1 ? 'time' : 'times'

    return [
      span({class: 'text-center inline-block opacity-50'})
        .append(text(`You have clicked ${count} ${word}`)),
    ]
  },
})

type CounterItemProps = {
  item: number
}

const CounterItem = component<CounterItemProps>({
  render({item}) {
    return [div().append(text(`[${item}]`))]
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

Application({}).mount(document.querySelector('#app')!)
