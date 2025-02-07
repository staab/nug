import {div, button, span, anchor, text, writable, derived, deriveChunks, NugComponent, ChunkedList} from './index.ts'

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

class CounterButton extends NugComponent<CounterButtonProps> {
  render({buttonText}) {
    return [
      button({click: incrementCount, class: 'btn btn-primary'})
        .append(text(buttonText))
    ]
  }
}

class CounterDisplay extends NugComponent {
  addProps(props) {
    return {...props, count}
  }

  render({count}) {
    const word = count === 1 ? 'time' : 'times'

    return [
      span({class: 'text-center inline-block opacity-50'})
        .append(text(`You have clicked ${count} ${word}`)),
    ]
  }
}

type CounterItemProps = {
  item: number
}

class CounterItem extends NugComponent<CounterItemProps> {
  render({item}) {
    return [div().append(text(`Item #${item}`))]
  }
}

type CounterProps = {
  buttonText: string
}

class Counter extends NugComponent<CounterProps> {
  render({buttonText}) {
    return [
      div({class: 'p-12 rounded-xl bg-base-100 text-base-content flex flex-col gap-2 min-h-96 w-96'})
        .append(new CounterButton({buttonText}))
        .append(new CounterDisplay({}))
        .append(
          div({class: 'flex flex-wrap gap-1'})
            .append(new ChunkedList({chunks, component: CounterItem}))
        )
    ]
  }
}

class Application extends NugComponent {
  render() {
    return [
      div({class: 'bg-base-300 h-screen inset-0 flex justify-center items-center flex-col gap-2'})
        .append(new Counter({buttonText: "Click me!"}))
        .append(
          anchor({class: "opacity-50 underline", href: "https://github.com/staab/nug"})
            .append(text("Powered by nug"))
        ),
    ]
  }
}

new Application({}).mount(document.querySelector('#app')!)
