import { useEffect } from 'react'
import SibyllaDashboard from './sibylla_dashboard'
import { useThemeStore } from './store/useThemeStore'
import Toaster from './core/components/Toast/Toaster'

function App() {
  const theme = useThemeStore(s => s.theme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <>
      <SibyllaDashboard />
      <Toaster />
    </>
  )
}

export default App
