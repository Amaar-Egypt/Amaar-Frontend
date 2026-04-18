import apiClient from './apiClient'
import type { AuthUser } from '../types/auth'

export interface RegisterRequest {
  name: string
  email: string
  password: string
}

export interface RegisterResponse {
  user?: AuthUser
  accessToken?: string
  refreshToken?: string
  message?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  user?: AuthUser
  accessToken?: string
  refreshToken?: string
  token?: string
  message?: string
}

export interface ProfileResponse extends AuthUser {
  reports?: unknown[]
  totalPoints?: number
  createdAt?: string
  updatedAt?: string
}

const register = async (data: RegisterRequest): Promise<RegisterResponse> => {
  const payload = {
    name: data.name.trim(),
    email: data.email.trim(),
    password: data.password,
  }

  const response = await apiClient.post<RegisterResponse>('/auth/register', payload)
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

const getCurrentUserProfile = async (): Promise<ProfileResponse> => {
  const response = await apiClient.get<ProfileResponse>('/users/me')
  return response.data
}

const authService = {
  register,
  login,
  getCurrentUserProfile,
}

export default authService
