import type { PropsWithChildren } from 'react'
import { AuthProvider } from './AuthContext'

const AppProviders = ({ children }: PropsWithChildren) => {
  return <AuthProvider>{children}</AuthProvider>
}

export default AppProviders
