import { getStoredToken } from './auth.js'

const VITE_ENV = import.meta.env ?? {}
const APP_BASE_URL = (
  VITE_ENV.VITE_APP_BASE_URL || 'https://api.dagegme.com'
).replace(/\/$/, '')
const API_BASE_URL = (VITE_ENV.VITE_API_BASE_URL || `${APP_BASE_URL}/api`).replace(/\/$/, '')

function buildUrl(path) {
  return `${API_BASE_URL}${path}`
}

function normalizeErrorMessage(payload, fallbackMessage) {
  const firstValidationError = payload?.errors
    ? Object.values(payload.errors).flat().find(Boolean)
    : null

  return firstValidationError ?? payload?.message ?? fallbackMessage
}

async function request(path, options = {}) {
  const { method = 'GET', body, token = getStoredToken() } = options
  const headers = {
    Accept: 'application/json',
  }
  const isFormData = body instanceof FormData

  if (body !== undefined && !isFormData) {
    headers['Content-Type'] = 'application/json'
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(buildUrl(path), {
    method,
    headers,
    body:
      body === undefined
        ? undefined
        : isFormData
          ? body
          : JSON.stringify(body),
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const error = new Error(
      normalizeErrorMessage(payload, 'მოთხოვნის შესრულება ვერ მოხერხდა.'),
    )

    error.status = response.status
    error.validationErrors = payload?.errors ?? {}

    throw error
  }

  return payload
}

export async function fetchResourceItems(resource) {
  const payload = await request(resource.publicPath)

  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload?.data)) {
    return payload.data
  }

  return []
}

export async function fetchResourceItem(resource, itemId) {
  const payload = await request(`${resource.publicPath}/${itemId}`)

  return payload?.data ?? payload
}

export async function fetchVips() {
  const payload = await request('/vips')

  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload?.data)) {
    return payload.data
  }

  return []
}

export function createResourceItem(resource, values) {
  return request(resource.adminPath, {
    method: 'POST',
    body: values,
  })
}

export function updateResourceItem(resource, itemId, values) {
  if (values instanceof FormData) {
    values.append('_method', 'PUT')

    return request(`${resource.adminPath}/${itemId}`, {
      method: 'POST',
      body: values,
    })
  }

  return request(`${resource.adminPath}/${itemId}`, {
    method: 'PUT',
    body: values,
  })
}

export function deleteResourceItem(resource, itemId) {
  return request(`${resource.adminPath}/${itemId}`, {
    method: 'DELETE',
  })
}

export function deleteResourcePhoto(resource, itemId, photoId) {
  return request(`${resource.adminPath}/${itemId}/photos/${photoId}`, {
    method: 'DELETE',
  })
}
