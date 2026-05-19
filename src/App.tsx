import { useEffect } from 'react'
import SibyllaDashboard from './sibylla_dashboard'
import { useThemeStore } from './store/useThemeStore'

function App() {
  const theme = useThemeStore(s => s.theme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return <SibyllaDashboard />
}

export default App
