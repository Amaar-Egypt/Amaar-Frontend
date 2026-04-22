import type { AuthSession } from '../types/auth'

const ACCESS_TOKEN_KEY = 'amaar.auth.access-token'
const REFRESH_TOKEN_KEY = 'amaar.auth.refresh-token'
const USER_KEY = 'amaar.auth.user'
const PERSIST_KEY = 'amaar.auth.persist'

const isBrowser = typeof window !== 'undefined'

const readPersistPreference = () => {
  if (!isBrowser) {
    return false
  }

  try {
    return localStorage.getItem(PERSIST_KEY) === 'true'
  } catch {
    return false
  }
}

const readSessionFromStorage = (storage: Storage): AuthSession | null => {
  const accessToken = storage.getItem(ACCESS_TOKEN_KEY)
  if (!accessToken) {
    return null
  }

  const refreshToken = storage.getItem(REFRESH_TOKEN_KEY) ?? undefined
  const rawUser = storage.getItem(USER_KEY)

  let user: AuthSession['user'] = null

  if (rawUser) {
    try {
      user = JSON.parse(rawUser)
    } catch {
      user = null
    }
  }

  return {
    accessToken,
    refreshToken,
    user,
  }
}

const clearFromStorage = (storage: Storage) => {
  storage.removeItem(ACCESS_TOKEN_KEY)
  storage.removeItem(REFRESH_TOKEN_KEY)
  storage.removeItem(USER_KEY)
}

export const readAuthSession = (): AuthSession | null => {
  if (!isBrowser) {
    return null
  }

  try {
    const localSession = readSessionFromStorage(localStorage)
    if (localSession) {
      return localSession
    }
  } catch {
    // Ignore localStorage access errors.
  }

  try {
    return readSessionFromStorage(sessionStorage)
  } catch {
    return null
  }
}

export const writeAuthSession = (session: AuthSession, persist = false) => {
  if (!isBrowser) {
    return
  }

  const targetStorage = persist ? localStorage : sessionStorage
  const otherStorage = persist ? sessionStorage : localStorage

  try {
    localStorage.setItem(PERSIST_KEY, String(persist))
  } catch {
    // Ignore localStorage issues in restricted browsing modes.
  }

  try {
    clearFromStorage(otherStorage)

    targetStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken)

    if (session.refreshToken) {
      targetStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken)
    } else {
      targetStorage.removeItem(REFRESH_TOKEN_KEY)
    }

    if (session.user) {
      targetStorage.setItem(USER_KEY, JSON.stringify(session.user))
    } else {
      targetStorage.removeItem(USER_KEY)
    }
  } catch {
    // Ignore storage write failures and keep state in memory.
  }
}

export const clearAuthSession = () => {
  if (!isBrowser) {
    return
  }

  try {
    clearFromStorage(localStorage)
    localStorage.removeItem(PERSIST_KEY)
  } catch {
    // Ignore localStorage cleanup failures.
  }

  try {
    clearFromStorage(sessionStorage)
  } catch {
    // Ignore sessionStorage cleanup failures.
  }
}

export const isSessionPersisted = () => {
  if (!isBrowser) {
    return false
  }

  try {
    return Boolean(localStorage.getItem(ACCESS_TOKEN_KEY))
  } catch {
    return readPersistPreference()
  }
}
