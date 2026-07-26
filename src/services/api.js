import { getStoredToken } from './auth.js'

const APP_BASE_URL = (import.meta.env.VITE_APP_BASE_URL || '').replace(/\/$/, '')
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || `${APP_BASE_URL}/api`).replace(/\/$/, '')
const STORAGE_URL = (import.meta.env.VITE_STORAGE_URL || `${APP_BASE_URL}/storage`).replace(/\/$/, '')

function buildUrl(path) {
  return `${API_BASE_URL}${path}`
}

export function buildAssetUrl(path) {
  if (!path) {
    return ''
  }

  if (/^https?:\/\//i.test(path)) {
    return path
  }

  const normalizedPath = path.replace(/^\/+/, '').replace(/^storage\//, '')

  return `${STORAGE_URL}/${normalizedPath}`
}

function normalizeErrorMessage(payload, fallbackMessage) {
  if (payload?.message) {
    return payload.message
  }

  const firstValidationError = payload?.errors
    ? Object.values(payload.errors).flat().find(Boolean)
    : null

  return firstValidationError ?? fallbackMessage
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
    throw new Error(
      normalizeErrorMessage(payload, 'მოთხოვნის შესრულება ვერ მოხერხდა.'),
    )
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

export function fetchResourceItem(resource, itemId) {
  return request(`${resource.publicPath}/${itemId}`)
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
