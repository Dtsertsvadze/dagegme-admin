const TOKEN_STORAGE_KEY = 'admin_token'
const ADMIN_STORAGE_KEY = 'admin_profile'
const APP_BASE_URL = (import.meta.env.VITE_APP_BASE_URL || '').replace(/\/$/, '')
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || `${APP_BASE_URL}/api`).replace(/\/$/, '')

function buildUrl(path) {
  return `${API_BASE_URL}${path}`
}

function normalizeErrorMessage(payload) {
  if (payload?.message) {
    return payload.message
  }

  const firstValidationError = payload?.errors
    ? Object.values(payload.errors).flat().find(Boolean)
    : null

  return firstValidationError ?? 'მითითებული მონაცემებით შესვლა ვერ მოხერხდა.'
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY) ?? ''
}

export function setStoredToken(token) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token)
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
}

export function getStoredAdmin() {
  const rawAdmin = localStorage.getItem(ADMIN_STORAGE_KEY)

  if (!rawAdmin) {
    return null
  }

  try {
    return JSON.parse(rawAdmin)
  } catch {
    localStorage.removeItem(ADMIN_STORAGE_KEY)
    return null
  }
}

export function setStoredAdmin(admin) {
  localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(admin))
}

export function clearStoredAdmin() {
  localStorage.removeItem(ADMIN_STORAGE_KEY)
}

export async function loginAdmin(credentials) {
  const response = await fetch(buildUrl('/admin/login'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(credentials),
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(normalizeErrorMessage(payload))
  }

  setStoredToken(payload.token)
  setStoredAdmin(payload.admin)

  return payload
}
