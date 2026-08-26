function selectedFile(value) {
  return value?.file instanceof File ? value.file : value
}

export function validateImageFiles(files) {
  for (const file of files) {
    if (!(file instanceof File) || !file.type.startsWith('image/')) {
      return `${file?.name || 'არჩეული ფაილი'} არ არის სწორი გამოსახულება.`
    }
  }

  return ''
}

export function validateVipPosition(values) {
  if (!values.vip) {
    return ''
  }

  const rawPosition = String(values.vip_order ?? '').trim()

  if (rawPosition === '') {
    return 'VIP position is required when VIP is enabled.'
  }

  const position = Number(rawPosition)

  if (!Number.isInteger(position) || position < 1) {
    return 'VIP position must be a positive integer.'
  }

  return ''
}

export function removeSelectedFile(values, fieldName, index) {
  const fieldValue = values[fieldName]

  if (!Array.isArray(fieldValue)) {
    return { ...values, [fieldName]: null }
  }

  return {
    ...values,
    [fieldName]: fieldValue.filter((_, fileIndex) => fileIndex !== index),
  }
}

export function removePhotoById(photos, photoId) {
  if (!Array.isArray(photos)) {
    return photos
  }

  return photos.filter((photo) => String(photo.id) !== String(photoId))
}

function appendFormDataValue(formData, field, value) {
  if (field.type.startsWith('translated-')) {
    const enValue = value.en.trim()
    const kaValue = value.ka.trim()

    if (field.required || enValue !== '' || kaValue !== '') {
      formData.append(`${field.name}[en]`, enValue)
      formData.append(`${field.name}[ka]`, kaValue)
    }
    return
  }

  if (field.type === 'boolean') {
    // FormData values are strings; Laravel validates 1/0 as booleans and the model casts them.
    formData.append(field.name, value ? '1' : '0')
    return
  }

  if (field.type === 'file') {
    const file = selectedFile(value)

    if (file instanceof File) {
      formData.append(field.name, file)
    }
    return
  }

  if (field.type === 'files') {
    value.forEach((selection) => {
      const file = selectedFile(selection)

      if (file instanceof File) {
        formData.append(`${field.name}[]`, file)
      }
    })
    return
  }

  if (field.type === 'list') {
    value
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => {
        formData.append(`${field.name}[]`, item)
      })
    return
  }

  if (field.type === 'number') {
    if (value !== '') {
      formData.append(field.name, String(Number(value)))
    }
    return
  }

  const trimmedValue = value.trim()

  if (trimmedValue !== '') {
    formData.append(field.name, trimmedValue)
  }
}

export function createMultipartPayload(resource, formValues) {
  const formData = new FormData()

  resource.fields.forEach((field) => {
    if (field.name === 'vip_order' && !formValues.vip) {
      return
    }

    appendFormDataValue(formData, field, formValues[field.name])
  })

  return formData
}
