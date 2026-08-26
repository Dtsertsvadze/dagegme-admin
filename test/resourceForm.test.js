import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createInitialFormValues,
  getResourceDefinition,
} from '../src/data/adminResources.js'
import {
  createResourceItem,
  deleteResourcePhoto,
  fetchVips,
  updateResourceItem,
} from '../src/services/api.js'
import {
  createMultipartPayload,
  removePhotoById,
  removeSelectedFile,
  validateImageFiles,
  validateVipPosition,
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
    },
  }
}

test('bands, studios, and rental cars expose gallery image fields', () => {
  for (const resourceKey of ['bands', 'studios', 'rental-cars']) {
    const resource = getResourceDefinition(resourceKey)
    const galleryField = resource.fields.find((field) => field.name === 'photos')
    const values = createInitialFormValues(resource)
    const galleryPhoto = imageFile(`${resourceKey}.jpg`)
    const payload = createMultipartPayload(resource, {
      ...values,
      photos: [{ file: galleryPhoto, previewUrl: `blob:${resourceKey}` }],
    })

    assert.equal(galleryField.type, 'files')
    assert.equal(galleryField.accept, 'image/*')
    assert.deepEqual(values.photos, [])
    assert.deepEqual(payload.getAll('photos[]'), [galleryPhoto])
  }

  const rentalCarProfileField = getResourceDefinition('rental-cars').fields
    .find((field) => field.name === 'profile_photo')

  assert.equal(rentalCarProfileField.type, 'file')
  assert.equal(rentalCarProfileField.table, true)
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

test('all providers except rental cars expose VIP position controls', () => {
  for (const resourceKey of [
    'photographers',
    'videographers',
    'bands',
    'djs',
    'presenters',
    'studios',
  ]) {
    const resource = getResourceDefinition(resourceKey)
    const vipField = resource.fields.find((field) => field.name === 'vip')
    const vipOrderField = resource.fields.find((field) => field.name === 'vip_order')
    const values = createInitialFormValues(resource)

    assert.equal(vipField.type, 'boolean')
    assert.equal(vipField.table, true)
    assert.equal(vipOrderField.type, 'number')
    assert.equal(vipOrderField.min, 1)
    assert.equal(vipOrderField.step, 1)
    assert.equal(vipOrderField.table, true)
    assert.equal(values.vip, false)
    assert.equal(values.vip_order, '')
    assert.equal(
      createMultipartPayload(resource, { ...values, vip: true, vip_order: '3' }).get('vip'),
      '1',
    )
    assert.equal(
      createMultipartPayload(resource, { ...values, vip: true, vip_order: '3' }).get('vip_order'),
      '3',
    )

    const disabledPayload = createMultipartPayload(resource, {
      ...values,
      vip: false,
      vip_order: '3',
    })

    assert.equal(disabledPayload.get('vip'), '0')
    assert.equal(disabledPayload.has('vip_order'), false)
  }

  const rentalCar = getResourceDefinition('rental-cars')

  assert.equal(rentalCar.fields.some((field) => field.name === 'vip'), false)
  assert.equal(rentalCar.fields.some((field) => field.name === 'vip_order'), false)
})

test('VIP position validation requires positive integers only while VIP is enabled', () => {
  assert.equal(validateVipPosition({ vip: false, vip_order: '' }), '')
  assert.match(validateVipPosition({ vip: true, vip_order: '' }), /required/)
  assert.match(validateVipPosition({ vip: true, vip_order: '0' }), /positive integer/)
  assert.match(validateVipPosition({ vip: true, vip_order: '1.5' }), /positive integer/)
  assert.equal(validateVipPosition({ vip: true, vip_order: '1' }), '')
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

test('the global VIP list is fetched from the public ordered endpoint', async () => {
  const originalFetch = globalThis.fetch
  const originalLocalStorage = globalThis.localStorage
  const requests = []
  const vipItems = [
    {
      provider_type: 'band',
      provider: {
        id: 7,
        name: { en: 'Band', ka: 'ბენდი' },
        vip: true,
        vip_order: 1,
      },
    },
  ]

  globalThis.localStorage = { getItem: () => '' }
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options })
    return new Response(JSON.stringify(vipItems), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    assert.deepEqual(await fetchVips(), vipItems)
  } finally {
    globalThis.fetch = originalFetch
    globalThis.localStorage = originalLocalStorage
  }

  assert.equal(requests[0].url, 'https://api.dagegme.com/api/vips')
  assert.equal(requests[0].options.method, 'GET')
})

test('multipart creates and updates are authenticated and gallery deletion uses resource routes', async () => {
  const resource = getResourceDefinition('rental-cars')
  const bandResource = getResourceDefinition('bands')
  const studioResource = getResourceDefinition('studios')
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
    await deleteResourcePhoto(bandResource, 2, 20)
    await deleteResourcePhoto(studioResource, 3, 30)
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
  assert.equal(
    requests[3].url,
    'https://api.dagegme.com/api/admin/bands/2/photos/20',
  )
  assert.equal(requests[3].options.method, 'DELETE')
  assert.equal(
    requests[4].url,
    'https://api.dagegme.com/api/admin/studios/3/photos/30',
  )
  assert.equal(requests[4].options.method, 'DELETE')
})

test('authentication and API validation messages remain available to the form', async () => {
  const resource = getResourceDefinition('bands')
  const originalFetch = globalThis.fetch
  const originalLocalStorage = globalThis.localStorage
  const responses = [
    new Response(
      JSON.stringify({
        message: 'The given data was invalid.',
        errors: { vip_order: ['VIP position 1 is already assigned.'] },
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
      (error) => {
        assert.equal(error.message, 'VIP position 1 is already assigned.')
        assert.equal(error.status, 422)
        assert.deepEqual(error.validationErrors, {
          vip_order: ['VIP position 1 is already assigned.'],
        })
        return true
      },
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
