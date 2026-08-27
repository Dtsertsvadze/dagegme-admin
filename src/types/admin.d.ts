export type Language = 'en' | 'ka'

export interface Translation {
  en: string
  ka: string
}

export interface GalleryPhoto {
  id: number
  band_id?: number
  photographer_id?: number
  rental_car_id?: number
  studio_id?: number
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
  profile_photo: string | null
  profile_photo_url: string | null
  links?: string[]
  sort_order?: number | null
  vip?: boolean
  vip_order?: number | null
  photos?: GalleryPhoto[]
  mark?: string
  model?: string
  year?: number
}

export interface ProviderFormValues {
  name?: Translation
  description?: Translation
  profile_photo: SelectedImageFile | null
  links?: string
  sort_order?: number | string
  vip?: boolean
  vip_order?: number | string
  photos?: SelectedImageFile[]
  mark?: string
  model?: string
  year?: string
}

export type VipProviderType =
  | 'photographer'
  | 'videographer'
  | 'band'
  | 'dj'
  | 'presenter'
  | 'studio'

export interface VipItem {
  provider_type: VipProviderType
  provider: ProviderRecord & {
    vip: true
    vip_order: number
  }
}
