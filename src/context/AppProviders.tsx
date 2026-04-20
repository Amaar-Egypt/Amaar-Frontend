import type { PropsWithChildren } from 'react'
import { AuthProvider } from './AuthContext'
import { ThemeProvider } from './ThemeContext'

const AppProviders = ({ children }: PropsWithChildren) => {
  return (
    <ThemeProvider>
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  )
}

export default AppProviders
