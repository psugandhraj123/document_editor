import { Provider } from 'react-redux'
import { store } from './store'
import type { ReactNode } from 'react'

interface StoreProviderProps {
  children: ReactNode
}

const StoreProvider = ({ children }: StoreProviderProps) => {
  return (
    <Provider store={store}>
      {children}
    </Provider>
  )
}

export default StoreProvider
