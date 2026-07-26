export type Language = 'en' | 'ka'

export interface Translation {
  en: string
  ka: string
}

export interface PhotographerPhoto {
  id: number
  photographer_id: number
  photo_path: string
  photo_url: string | null
}

export interface ProviderRecord {
  id: number
  name?: Translation
  description?: Translation | null
  city: Translation
  profile_photo: string | null
  profile_photo_url: string | null
  links?: string[]
  vip?: boolean
  photos?: PhotographerPhoto[]
  mark?: string
  model?: string
  year?: number
}

export interface ProviderFormValues {
  name?: Translation
  description?: Translation
  city: Translation
  profile_photo: File | null
  links?: string
  vip?: boolean
  photos?: File[]
  mark?: string
  model?: string
  year?: string
}
