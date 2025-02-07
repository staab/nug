# Nug

Nug is a minimal reactive DOM system, based on svelte 4. It does not use DOM diffing or proxies, because magic sucks. This project was inspired by the pain of migrating my applications to svelte 5.

This is alpha software, don't use it unless you're willing to read the code (there isn't very much of it).

# Todo

- [ ] Remove get
- [ ] Remove subscribe options, use a utility to skip the first run
- [ ] Convert props/watch into arguments to render? Maybe not
- [ ] Change to class components for debugging
- [ ] Fix reactivity when removing items from chunkedlists

# Example

The code below is similar to the code in example.ts. To see the demo, clone the repository and run `npm i && npm run dev` or visit [https://nug-n8tt.onrender.com/](https://nug-n8tt.onrender.com/).

```typescript
import {div, button, span, text, writable, derived, deriveChunks, component, ChunkedList} from 'nug'

// This is our reactive state
const count = writable(0)

// We're going to inflate our count into items for illustration
const items = derived([count], ([$count]) => {
  const $items = []

  for (let i = 0; i < $count; i++) {
    $items.push(i)
  }

  return $items
})

// The ChunkedList helpers help manage re-rendering. The entire list will only re-render
// when items move from one chunk to another, or when a new chunk is added. To see this in
// action, watch the dev tools when running the demo to see which dom nodes get updated.
const chunks = deriveChunks({
  chunkSize: 5,
  store: items,
  getKey: x => x,
})

// An action is just something that updates state
const incrementCount = () => count.update(c => c + 1)

// A counter button
const CounterButton = component({
  render({buttonText}) {
    return [
      button({click: incrementCount}).append(text(buttonText))
    ]
  },
})

// The display for our counter. Note `watch` is what makes the component reactive
const CounterDisplay = component({
  watch() {
    return [count]
  },
  render() {
    return [
      span({style: 'color: red; padding-left: 12px;'}).append(text(count.get())),
    ]
  },
})

// This displays one of our items
const CounterItem = component({
  render({item}) {
    return [div().append(text(item))]
  },
})

// Our couter component. ChunkedList takes CounterItem as a component, along with
// our item tree
const Counter = component({
  render({buttonText}) {
    return [
      CounterButton({buttonText}),
      CounterDisplay({}),
      ChunkedList({chunks, component: CounterItem}),
    ]
  },
})

// One final wrapper component
const Application = component({
  render() {
    return [
      Counter({buttonText: "Click me!"}),
    ]
  },
})

// Mount our application
Application({}).render(document.querySelector('#app'))
```
