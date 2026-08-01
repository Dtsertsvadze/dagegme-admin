export type Language = 'en' | 'ka'

export interface Translation {
  en: string
  ka: string
}

export interface GalleryPhoto {
  id: number
  photographer_id?: number
  rental_car_id?: number
  photo_path: string
  photo_url: string | null
}

export interface SelectedImageFile {
  file: File
  previewUrl: string
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
  photos?: GalleryPhoto[]
  mark?: string
  model?: string
  year?: number
}

export interface ProviderFormValues {
  name?: Translation
  description?: Translation
  city: Translation
  profile_photo: SelectedImageFile | null
  links?: string
  vip?: boolean
  photos?: SelectedImageFile[]
  mark?: string
  model?: string
  year?: string
}
