import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createInitialFormValues,
  getResourceDefinition,
} from '../src/data/adminResources.js'
import {
  createResourceItem,
  deleteResourcePhoto,
  updateResourceItem,
} from '../src/services/api.js'
import {
  createMultipartPayload,
  removePhotoById,
  removeSelectedFile,
  validateImageFiles,
} from '../src/utils/resourceForm.js'

function imageFile(name, contents = 'image', type = 'image/jpeg') {
  return new File([contents], name, { type })
}

function rentalCarValues() {
  const resource = getResourceDefinition('rental-cars')
  const values = createInitialFormValues(resource)

  return {
    resource,
    values: {
      ...values,
      mark: 'Mercedes-Benz',
      model: 'E-Class',
      year: '2024',
      city: { en: 'Tbilisi', ka: 'თბილისი' },
    },
  }
}

test('rental cars expose profile and gallery image fields', () => {
  const resource = getResourceDefinition('rental-cars')
  const profileField = resource.fields.find((field) => field.name === 'profile_photo')
  const galleryField = resource.fields.find((field) => field.name === 'photos')

  assert.equal(profileField.type, 'file')
  assert.equal(profileField.table, true)
  assert.equal(galleryField.type, 'files')
  assert.equal(galleryField.accept, 'image/*')
})

test('DJs expose a bilingual description field and include it in the payload', () => {
  const resource = getResourceDefinition('djs')
  const descriptionField = resource.fields.find((field) => field.name === 'description')
  const values = createInitialFormValues(resource)
  const payload = createMultipartPayload(resource, {
    ...values,
    description: { en: 'English description', ka: 'ქართული აღწერა' },
  })

  assert.equal(descriptionField.type, 'translated-textarea')
  assert.deepEqual(values.description, { en: '', ka: '' })
  assert.equal(payload.get('description[en]'), 'English description')
  assert.equal(payload.get('description[ka]'), 'ქართული აღწერა')
})

test('create payload sends the profile image and every gallery image with Laravel keys', () => {
  const { resource, values } = rentalCarValues()
  const profilePhoto = imageFile('profile.jpg')
  const firstGalleryPhoto = imageFile('front.jpg')
  const secondGalleryPhoto = imageFile('interior.jpg')
  const payload = createMultipartPayload(resource, {
    ...values,
    profile_photo: { file: profilePhoto, previewUrl: 'blob:profile' },
    photos: [
      { file: firstGalleryPhoto, previewUrl: 'blob:front' },
      { file: secondGalleryPhoto, previewUrl: 'blob:interior' },
    ],
  })

  assert.equal(payload.get('model'), 'E-Class')
  assert.equal(payload.get('mark'), 'Mercedes-Benz')
  assert.equal(payload.get('year'), '2024')
  assert.equal(payload.get('city[en]'), 'Tbilisi')
  assert.equal(payload.get('city[ka]'), 'თბილისი')
  assert.equal(payload.get('profile_photo'), profilePhoto)
  assert.deepEqual(payload.getAll('photos[]'), [firstGalleryPhoto, secondGalleryPhoto])
  assert.equal(payload.has('replace_photos'), false)
})

test('an update with no selected images omits image keys so existing images are preserved', () => {
  const { resource, values } = rentalCarValues()
  const payload = createMultipartPayload(resource, values)

  assert.equal(payload.has('profile_photo'), false)
  assert.equal(payload.has('photos[]'), false)
  assert.equal(payload.has('replace_photos'), false)
})

test('new gallery selections are the only photos included in an update payload', () => {
  const { resource, values } = rentalCarValues()
  const newPhoto = imageFile('new.jpg')
  const payload = createMultipartPayload(resource, {
    ...values,
    photos: [{ file: newPhoto, previewUrl: 'blob:new' }],
  })

  assert.deepEqual(payload.getAll('photos[]'), [newPhoto])
})

test('image validation accepts large images and rejects non-image files', () => {
  const largeImage = imageFile(
    'large.jpg',
    new Uint8Array(12 * 1024 * 1024),
  )
  const textFile = new File(['not an image'], 'notes.txt', { type: 'text/plain' })

  assert.equal(validateImageFiles([largeImage]), '')
  assert.match(validateImageFiles([textFile]), /არ არის სწორი გამოსახულება/)
})

test('removing one existing photo or one local selection leaves the others untouched', () => {
  const existingPhotos = [{ id: 10 }, { id: 11 }, { id: 12 }]
  const selections = [{ file: 'first' }, { file: 'second' }, { file: 'third' }]

  assert.deepEqual(removePhotoById(existingPhotos, '11'), [{ id: 10 }, { id: 12 }])
  assert.deepEqual(
    removeSelectedFile({ photos: selections }, 'photos', 1).photos,
    [selections[0], selections[2]],
  )
})

test('multipart creates and updates are authenticated and photo deletion uses DELETE', async () => {
  const resource = getResourceDefinition('rental-cars')
  const requests = []
  const originalFetch = globalThis.fetch
  const originalLocalStorage = globalThis.localStorage

  globalThis.localStorage = {
    getItem(key) {
      return key === 'admin_token' ? 'test-token' : null
    },
  }
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options })
    return new Response(JSON.stringify({ message: 'ok' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const createPayload = new FormData()
    createPayload.append('model', 'E-Class')
    const updatePayload = new FormData()
    updatePayload.append('model', 'E-Class')

    await createResourceItem(resource, createPayload)
    await updateResourceItem(resource, 1, updatePayload)
    await deleteResourcePhoto(resource, 1, 10)
  } finally {
    globalThis.fetch = originalFetch
    globalThis.localStorage = originalLocalStorage
  }

  assert.equal(requests[0].url, 'https://api.dagegme.com/api/admin/rental-cars')
  assert.equal(requests[0].options.method, 'POST')
  assert.equal(requests[0].options.headers.Authorization, 'Bearer test-token')
  assert.equal(requests[0].options.body.has('_method'), false)
  assert.equal(requests[1].url, 'https://api.dagegme.com/api/admin/rental-cars/1')
  assert.equal(requests[1].options.method, 'POST')
  assert.equal(requests[1].options.headers.Authorization, 'Bearer test-token')
  assert.equal(requests[1].options.body.get('_method'), 'PUT')
  assert.equal(
    requests[2].url,
    'https://api.dagegme.com/api/admin/rental-cars/1/photos/10',
  )
  assert.equal(requests[2].options.method, 'DELETE')
  assert.equal(requests[2].options.headers.Authorization, 'Bearer test-token')
})

test('authentication and API validation messages remain available to the form', async () => {
  const resource = getResourceDefinition('rental-cars')
  const originalFetch = globalThis.fetch
  const originalLocalStorage = globalThis.localStorage
  const responses = [
    new Response(
      JSON.stringify({
        message: 'The given data was invalid.',
        errors: { 'photos.0': ['The photos.0 must be an image.'] },
      }),
      {
        status: 422,
        headers: { 'Content-Type': 'application/json' },
      },
    ),
    new Response(JSON.stringify({ message: 'Unauthenticated.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    }),
  ]

  globalThis.localStorage = { getItem: () => 'expired-token' }
  globalThis.fetch = async () => responses.shift()

  try {
    await assert.rejects(
      createResourceItem(resource, new FormData()),
      /The photos\.0 must be an image\./,
    )
    await assert.rejects(
      deleteResourcePhoto(resource, 1, 10),
      /Unauthenticated\./,
    )
  } finally {
    globalThis.fetch = originalFetch
    globalThis.localStorage = originalLocalStorage
  }
})
