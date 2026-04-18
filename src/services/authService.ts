import apiClient from './apiClient'

export interface RegisterRequest {
  name: string
  email: string
  password: string
  confirmPassword: string
}

export interface RegisterResponse {
  message?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  message?: string
  token?: string
  accessToken?: string
  data?: {
    token?: string
    accessToken?: string
  }
}

const register = async (data: RegisterRequest): Promise<RegisterResponse> => {
  const response = await apiClient.post<RegisterResponse>('/auth/register', data)
  return response.data
}

const login = async (data: LoginRequest): Promise<LoginResponse> => {
  const payload: LoginRequest = {
    email: data.email.trim(),
    password: data.password,
  }

  const headers = {
    'Content-Type': 'application/json',
  }

  const response = await apiClient.post<LoginResponse>('/auth/login', payload, {
    headers,
  })

  return response.data
}

const authService = {
  register,
  login,
}

export default authService
