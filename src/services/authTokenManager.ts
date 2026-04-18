let currentAccessToken: string | null = null

type AuthFailureHandler = () => void

let authFailureHandler: AuthFailureHandler | null = null

export const setAccessToken = (token: string | null) => {
  currentAccessToken = token
}

export const getAccessToken = () => currentAccessToken

export const registerAuthFailureHandler = (handler: AuthFailureHandler | null) => {
  authFailureHandler = handler
}

export const notifyAuthFailure = () => {
  authFailureHandler?.()
}
