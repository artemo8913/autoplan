import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { counterStore } from './store'
import { observer } from 'mobx-react-lite'

const App = observer(() => {
  return (
    <>
      <div>
        <a rel="noopener" href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a rel="noopener" href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <h2>Counter: {counterStore.count}</h2>
        <button onClick={() => counterStore.increment()}>Increment</button>
        <button onClick={() => counterStore.decrement()}>Decrement</button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
})

export default App
