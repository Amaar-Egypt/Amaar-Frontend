interface AuthTokens {
  accessToken: string | null
  refreshToken: string | null
}

let currentAccessToken: string | null = null
let currentRefreshToken: string | null = null

type AuthFailureHandler = () => void
type AuthTokensRefreshedHandler = (tokens: AuthTokens) => void

let authFailureHandler: AuthFailureHandler | null = null
let authTokensRefreshedHandler: AuthTokensRefreshedHandler | null = null

export const setAuthTokens = ({
  accessToken,
  refreshToken,
}: {
  accessToken: string | null
  refreshToken?: string | null
}) => {
  currentAccessToken = accessToken

  if (typeof refreshToken !== 'undefined') {
    currentRefreshToken = refreshToken
  }
}

export const setAccessToken = (token: string | null) => {
  setAuthTokens({
    accessToken: token,
  })
}

export const getAccessToken = () => currentAccessToken
export const getRefreshToken = () => currentRefreshToken

export const applyRefreshedTokens = ({
  accessToken,
  refreshToken,
}: {
  accessToken: string
  refreshToken?: string | null
}) => {
  setAuthTokens({
    accessToken,
    refreshToken,
  })

  authTokensRefreshedHandler?.({
    accessToken: currentAccessToken,
    refreshToken: currentRefreshToken,
  })
}

export const registerAuthTokensRefreshedHandler = (
  handler: AuthTokensRefreshedHandler | null,
) => {
  authTokensRefreshedHandler = handler
}

export const registerAuthFailureHandler = (handler: AuthFailureHandler | null) => {
  authFailureHandler = handler
}

export const notifyAuthFailure = () => {
  authFailureHandler?.()
}
