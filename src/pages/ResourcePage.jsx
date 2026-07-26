import { useEffect, useState } from 'react'
import {
  createInitialFormValues,
  getResourceDefinition,
  getResourceItemTitle,
  getTranslatedValue,
} from '../data/adminResources.js'
import {
  buildAssetUrl,
  createResourceItem,
  deleteResourceItem,
  deleteResourcePhoto,
  fetchResourceItem,
  fetchResourceItems,
  updateResourceItem,
} from '../services/api.js'

function fieldValueToInput(field, value) {
  if (field.type.startsWith('translated-')) {
    return {
      en: value?.en ?? '',
      ka: value?.ka ?? '',
    }
  }

  if (field.type === 'boolean') {
    return Boolean(value)
  }

  if (field.type === 'list') {
    return Array.isArray(value) ? value.join('\n') : ''
  }

  if (field.type === 'file') {
    return null
  }

  if (field.type === 'files') {
    return []
  }

  return value ?? ''
}

function createFormValues(resource, item) {
  const initialValues = createInitialFormValues(resource)

  if (!item) {
    return initialValues
  }

  return resource.fields.reduce((values, field) => {
    values[field.name] = fieldValueToInput(field, item[field.name])
    return values
  }, initialValues)
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
    if (value instanceof File) {
      formData.append(field.name, value)
    }
    return
  }

  if (field.type === 'files') {
    value.forEach((file) => {
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

function createMultipartPayload(resource, formValues) {
  const formData = new FormData()

  resource.fields.forEach((field) => {
    appendFormDataValue(formData, field, formValues[field.name])
  })

  return formData
}

function extractAssetUrl(asset) {
  if (!asset) {
    return ''
  }

  if (typeof asset === 'string') {
    return buildAssetUrl(asset)
  }

  if (typeof asset === 'object') {
    const directPath =
      asset.photo_path ??
      asset.url ??
      asset.path ??
      asset.photo ??
      asset.profile_photo ??
      asset.image ??
      asset.image_url ??
      asset.image_path ??
      asset.file ??
      asset.file_path

    if (typeof directPath === 'string' && directPath.trim() !== '') {
      return buildAssetUrl(directPath)
    }

    const fallbackPath = Object.values(asset).find(
      (value) =>
        typeof value === 'string' &&
        value.trim() !== '' &&
        !/^https?:\/\//i.test(value) &&
        (value.includes('/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(value)),
    )

    if (typeof fallbackPath === 'string') {
      return buildAssetUrl(fallbackPath)
    }
  }

  return ''
}

function renderCurrentAsset(
  field,
  item,
  existingAssets,
  onRequestPhotoDelete,
  isDeletingPhoto,
) {
  const value = existingAssets?.[field.name] ?? item?.[field.name]

  if (!value) {
    return null
  }

  if (field.type === 'files' && Array.isArray(value)) {
    const previewUrls = value
      .map((asset) => extractAssetUrl(asset))
      .filter(Boolean)

    return (
      <div className="asset-preview-block">
        <p className="field-help">
          მიმდინარე გალერეა: {value.length} ფოტო
        </p>
        {previewUrls.length > 0 ? (
          <div className="asset-preview-grid">
            {value.map((asset, index) => (
              <div key={`${extractAssetUrl(asset)}-${index}`} className="asset-preview-item">
                <img
                  className="asset-preview-thumb"
                  src={extractAssetUrl(asset)}
                  alt={`${field.label} ${index + 1}`}
                />
                {asset?.id ? (
                  <button
                    className="asset-remove-button"
                    type="button"
                    aria-label={`ფოტო ${index + 1}-ის წაშლა`}
                    title="ფოტოს წაშლა"
                    disabled={isDeletingPhoto}
                    onClick={() => onRequestPhotoDelete(field, asset, index)}
                  >
                    ×
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    )
  }

  if (field.type === 'file' && typeof value === 'string') {
    const previewUrl = extractAssetUrl(value)

    return (
      <div className="asset-preview-block">
        <p className="field-help">მიმდინარე ფოტო</p>
        {previewUrl ? (
          <img className="asset-preview-thumb" src={previewUrl} alt={field.label} />
        ) : null}
      </div>
    )
  }

  return null
}

function renderSelectedFiles(field, value) {
  if (field.type === 'file' && value instanceof File) {
    return <p className="field-help">არჩეულია: {value.name}</p>
  }

  if (field.type === 'files' && Array.isArray(value) && value.length > 0) {
    return (
      <p className="field-help">
        არჩეულია {value.length} ფაილი
      </p>
    )
  }

  return null
}

function ResourceForm({
  activeItem,
  existingAssets,
  resource,
  formValues,
  formError,
  isSaving,
  isDeletingPhoto,
  onChange,
  onRequestPhotoDelete,
  onSubmit,
  onCancel,
}) {
  return (
    <section className="editor-card modal-card">
      <div className="editor-head">
        <div>
          <h3 id="resource-editor-title">
            {activeItem ? `${resource.singularLabel} - რედაქტირება` : `ახალი ${resource.singularLabel}`}
          </h3>
          <p>შეავსეთ ორივე ენის ველები და შეინახეთ ცვლილებები.</p>
        </div>
        <button className="secondary-button compact-button" type="button" onClick={onCancel}>
          დახურვა
        </button>
      </div>

      <form className="editor-form" onSubmit={onSubmit}>
        <div className="editor-grid">
          {resource.fields.map((field) => {
            const isWideField =
              field.type.includes('textarea') || field.type === 'list' || field.type === 'files'

            if (field.type.startsWith('translated-')) {
              const Input = field.type === 'translated-textarea' ? 'textarea' : 'input'

              return (
                <fieldset
                  key={field.name}
                  className={isWideField ? 'field translated-field field-wide' : 'field translated-field'}
                >
                  <legend>{field.label}</legend>
                  <div className="translation-grid">
                    {['en', 'ka'].map((language) => (
                      <label key={language} htmlFor={`${field.name}-${language}`}>
                        <span>{language === 'en' ? 'ინგლისური' : 'ქართული'}</span>
                        <Input
                          id={`${field.name}-${language}`}
                          name={field.name}
                          data-language={language}
                          type={field.type === 'translated-text' ? 'text' : undefined}
                          rows={field.type === 'translated-textarea' ? 5 : undefined}
                          value={formValues[field.name][language]}
                          onChange={onChange}
                          placeholder={`${field.label} ${language === 'en' ? 'ინგლისურად' : 'ქართულად'}`}
                          required={field.required}
                        />
                      </label>
                    ))}
                  </div>
                </fieldset>
              )
            }

            return (
              <div
                key={field.name}
                className={isWideField ? 'field field-wide' : 'field'}
              >
                <label htmlFor={field.name}>{field.label}</label>
                {field.type === 'textarea' || field.type === 'list' ? (
                  <textarea
                    id={field.name}
                    name={field.name}
                    rows={field.type === 'list' ? 5 : 6}
                    value={formValues[field.name]}
                    onChange={onChange}
                    placeholder={
                      field.type === 'list'
                        ? 'თითო ბმული ახალ ხაზზე'
                        : `შეიყვანეთ ${field.label.toLowerCase()}`
                    }
                  />
                ) : field.type === 'file' || field.type === 'files' ? (
                  <>
                    <input
                      id={field.name}
                      name={field.name}
                      type="file"
                      accept={field.accept}
                      multiple={field.type === 'files'}
                      onChange={onChange}
                      required={field.required && !activeItem}
                    />
                    {renderCurrentAsset(
                      field,
                      activeItem,
                      existingAssets,
                      onRequestPhotoDelete,
                      isDeletingPhoto,
                    )}
                    {renderSelectedFiles(field, formValues[field.name])}
                  </>
                ) : field.type === 'boolean' ? (
                  <label className="switch-control" htmlFor={field.name}>
                    <input
                      id={field.name}
                      name={field.name}
                      type="checkbox"
                      checked={formValues[field.name]}
                      onChange={onChange}
                    />
                    <span>{formValues[field.name] ? 'VIP ჩართულია' : 'სტანდარტული'}</span>
                  </label>
                ) : (
                  <input
                    id={field.name}
                    name={field.name}
                    type={field.type === 'number' ? 'number' : 'text'}
                    value={formValues[field.name]}
                    onChange={onChange}
                    placeholder={`შეიყვანეთ ${field.label.toLowerCase()}`}
                    required={field.required}
                  />
                )}
              </div>
            )
          })}
        </div>

        {formError ? <div className="form-error">{formError}</div> : null}

        <div className="editor-actions">
          <button className="primary-button" type="submit" disabled={isSaving}>
            {isSaving ? 'ინახება...' : 'შენახვა'}
          </button>
        </div>
      </form>
    </section>
  )
}

function formatTableValue(field, item, displayLanguage) {
  const value = item[field.name]

  if (field.type.startsWith('translated-')) {
    return getTranslatedValue(value, displayLanguage) || '-'
  }

  if (field.type === 'boolean') {
    return <span className={value ? 'status-badge status-vip' : 'status-badge'}>{value ? 'VIP' : 'სტანდარტული'}</span>
  }

  return value || '-'
}

function validateTranslatedFields(resource, formValues) {
  for (const field of resource.fields.filter((entry) => entry.type.startsWith('translated-'))) {
    const enValue = formValues[field.name].en.trim()
    const kaValue = formValues[field.name].ka.trim()

    if ((field.required || enValue || kaValue) && (!enValue || !kaValue)) {
      return `${field.label} აუცილებელია შეავსოთ ინგლისურად და ქართულად.`
    }
  }

  return ''
}

function ResourcePage({ resourceKey }) {
  const displayLanguage = 'ka'
  const resource = getResourceDefinition(resourceKey)
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [formError, setFormError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [pendingPhotoDelete, setPendingPhotoDelete] = useState(null)
  const [photoDeleteError, setPhotoDeleteError] = useState('')
  const [isDeletingPhoto, setIsDeletingPhoto] = useState(false)
  const [activeItemId, setActiveItemId] = useState(null)
  const [existingAssets, setExistingAssets] = useState({})
  const [formValues, setFormValues] = useState(() =>
    resource ? createInitialFormValues(resource) : {},
  )

  useEffect(() => {
    if (!resource) {
      return
    }

    let isCancelled = false

    async function loadItems() {
      setIsLoading(true)
      setPageError('')

      try {
        const nextItems = await fetchResourceItems(resource)

        if (!isCancelled) {
          setItems(nextItems)
        }
      } catch (error) {
        if (!isCancelled) {
          setPageError(error.message)
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    loadItems()

    return () => {
      isCancelled = true
    }
  }, [resource])

  if (!resource) {
    return null
  }

  const tableFields = resource.fields.filter((field) => field.table)
  const activeItem = items.find((item) => item.id === activeItemId) ?? null

  function handleCreateClick() {
    setIsEditorOpen(true)
    setActiveItemId(null)
    setExistingAssets({})
    setFormValues(createInitialFormValues(resource))
    setFormError('')
    setPendingPhotoDelete(null)
    setPhotoDeleteError('')
  }

  function handleRequestPhotoDelete(field, photo, index) {
    setPendingPhotoDelete({ field, photo, index })
    setPhotoDeleteError('')
  }

  function handleCancelPhotoDelete() {
    if (isDeletingPhoto) {
      return
    }

    setPendingPhotoDelete(null)
    setPhotoDeleteError('')
  }

  async function handleConfirmPhotoDelete() {
    if (!activeItem || !pendingPhotoDelete?.photo?.id) {
      return
    }

    const { field, photo } = pendingPhotoDelete
    setIsDeletingPhoto(true)
    setPhotoDeleteError('')

    try {
      const result = await deleteResourcePhoto(resource, activeItem.id, photo.id)
      const deletedPhotoId = result?.deleted_photo_id ?? photo.id

      setExistingAssets((current) => ({
        ...current,
        [field.name]: (current[field.name] ?? []).filter(
          (asset) => asset.id !== deletedPhotoId,
        ),
      }))
      setItems((current) =>
        current.map((item) =>
          item.id === activeItem.id
            ? {
                ...item,
                [field.name]: Array.isArray(item[field.name])
                  ? item[field.name].filter((asset) => asset.id !== deletedPhotoId)
                  : item[field.name],
              }
            : item,
        ),
      )
      setPendingPhotoDelete(null)
    } catch (error) {
      setPhotoDeleteError(error.message)
    } finally {
      setIsDeletingPhoto(false)
    }
  }

  function handleFieldChange(event) {
    const { checked, dataset, files, name, type, value, multiple } = event.target

    if (type === 'file') {
      setFormValues((current) => ({
        ...current,
        [name]: multiple ? Array.from(files ?? []) : (files?.[0] ?? null),
      }))
      return
    }

    if (dataset.language) {
      setFormValues((current) => ({
        ...current,
        [name]: {
          ...current[name],
          [dataset.language]: value,
        },
      }))
      return
    }

    if (type === 'checkbox') {
      setFormValues((current) => ({
        ...current,
        [name]: checked,
      }))
      return
    }

    setFormValues((current) => ({
      ...current,
      [name]: value,
    }))
  }

  async function handleEdit(item) {
    setPageError('')

    let detailedItem = item

    try {
      detailedItem = await fetchResourceItem(resource, item.id)
    } catch (error) {
      setPageError(error.message)
      return
    }

    setIsEditorOpen(true)
    setActiveItemId(detailedItem.id)
    setExistingAssets(
      resource.fields.reduce((assets, field) => {
        if (field.type === 'files') {
          assets[field.name] = Array.isArray(detailedItem[field.name]) ? detailedItem[field.name] : []
        }

        return assets
      }, {}),
    )
    setFormValues(createFormValues(resource, detailedItem))
    setFormError('')
  }

  function handleCloseEditor() {
    setIsEditorOpen(false)
    setActiveItemId(null)
    setExistingAssets({})
    setFormValues(createInitialFormValues(resource))
    setFormError('')
  }

  async function handleDelete(item) {
    const shouldDelete = window.confirm(`წავშალოთ ${getResourceItemTitle(resource, item, displayLanguage)}?`)

    if (!shouldDelete) {
      return
    }

    try {
      await deleteResourceItem(resource, item.id)
      setItems((current) => current.filter((entry) => entry.id !== item.id))

      if (activeItemId === item.id) {
        handleCreateClick()
      }
    } catch (error) {
      setPageError(error.message)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const validationError = validateTranslatedFields(resource, formValues)

    if (validationError) {
      setFormError(validationError)
      return
    }

    setIsSaving(true)
    setFormError('')

    const payload = createMultipartPayload(resource, formValues)

    try {
      const savedItem = activeItem
        ? await updateResourceItem(resource, activeItem.id, payload)
        : await createResourceItem(resource, payload)

      const nextItem = savedItem?.data ?? savedItem

      setItems((current) => {
        if (activeItem) {
          return current.map((item) => (item.id === activeItem.id ? nextItem : item))
        }

        return [nextItem, ...current]
      })

      handleCloseEditor()
    } catch (error) {
      setFormError(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="resource-page">
      <header className="resource-header">
        <div>
          <h2>{resource.label}</h2>
        </div>

        <div className="resource-header-actions">
          <button className="secondary-button compact-button" type="button" onClick={handleCreateClick}>
            დამატება
          </button>
        </div>
      </header>

      {pageError ? <div className="form-error page-error">{pageError}</div> : null}

      <div className="resource-body">
        <section className="table-card">
          <div className="table-head">
            <div>
              <h3>ჩანაწერები</h3>
              <p>{isLoading ? 'იტვირთება...' : `${items.length} ჩანაწერი`}</p>
            </div>
          </div>

          {isLoading ? (
            <div className="empty-state">იტვირთება...</div>
          ) : items.length === 0 ? (
            <div className="empty-state">ჩანაწერები ჯერ არ არის.</div>
          ) : (
            <>
              <div className="table-scroll">
                <table className="admin-table">
                  <thead>
                    <tr>
                      {tableFields.map((field) => (
                        <th key={field.name}>{field.label}</th>
                      ))}
                      <th>მოქმედებები</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id}>
                        {tableFields.map((field) => (
                          <td key={field.name}>{formatTableValue(field, item, displayLanguage)}</td>
                        ))}
                        <td>
                          <div className="row-actions">
                            <button
                              className="secondary-button compact-button"
                              type="button"
                              onClick={() => handleEdit(item)}
                            >
                              რედაქტირება
                            </button>
                            <button
                              className="danger-button compact-button"
                              type="button"
                              onClick={() => handleDelete(item)}
                            >
                              წაშლა
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mobile-cards">
                {items.map((item) => (
                  <article key={item.id} className="mobile-card">
                    <div className="mobile-card-head">
                      <div>
                        <h3>{getResourceItemTitle(resource, item, displayLanguage)}</h3>
                        <p>ID #{item.id}</p>
                      </div>
                      <div className="row-actions">
                        <button
                          className="secondary-button compact-button"
                          type="button"
                          onClick={() => handleEdit(item)}
                        >
                          რედაქტირება
                        </button>
                        <button
                          className="danger-button compact-button"
                          type="button"
                          onClick={() => handleDelete(item)}
                        >
                          წაშლა
                        </button>
                      </div>
                    </div>

                    <dl className="mobile-card-grid">
                      {tableFields.map((field) => (
                        <div key={field.name}>
                          <dt>{field.label}</dt>
                          <dd>{formatTableValue(field, item, displayLanguage)}</dd>
                        </div>
                      ))}
                    </dl>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      {isEditorOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={handleCloseEditor}>
          <div
            className="modal-shell"
            role="dialog"
            aria-modal="true"
            aria-labelledby="resource-editor-title"
            onClick={(event) => event.stopPropagation()}
          >
            <ResourceForm
              activeItem={activeItem}
              existingAssets={existingAssets}
              resource={resource}
              formValues={formValues}
              formError={formError}
              isSaving={isSaving}
              isDeletingPhoto={isDeletingPhoto}
              onChange={handleFieldChange}
              onRequestPhotoDelete={handleRequestPhotoDelete}
              onSubmit={handleSubmit}
              onCancel={handleCloseEditor}
            />
          </div>
        </div>
      ) : null}

      {pendingPhotoDelete ? (
        <div
          className="modal-backdrop confirmation-backdrop"
          role="presentation"
          onClick={handleCancelPhotoDelete}
        >
          <section
            className="confirmation-card"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="photo-delete-title"
            aria-describedby="photo-delete-description"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="photo-delete-title">ფოტოს წაშლა</h3>
            <p id="photo-delete-description">
              ნამდვილად გსურთ გალერეიდან ფოტოs წაშლა?
            </p>

            {photoDeleteError ? <div className="form-error">{photoDeleteError}</div> : null}

            <div className="confirmation-actions">
              <button
                className="secondary-button"
                type="button"
                disabled={isDeletingPhoto}
                onClick={handleCancelPhotoDelete}
              >
                გაუქმება
              </button>
              <button
                className="danger-button"
                type="button"
                disabled={isDeletingPhoto}
                onClick={handleConfirmPhotoDelete}
              >
                {isDeletingPhoto ? 'იშლება...' : 'წაშლა'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}

export default ResourcePage
