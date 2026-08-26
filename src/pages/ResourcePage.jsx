import { useEffect, useState } from 'react'
import {
  createInitialFormValues,
  getResourceDefinition,
  getResourceItemTitle,
  getTranslatedValue,
} from '../data/adminResources.js'
import {
  createResourceItem,
  deleteResourceItem,
  deleteResourcePhoto,
  fetchResourceItem,
  fetchResourceItems,
  fetchVips,
  updateResourceItem,
} from '../services/api.js'
import {
  createMultipartPayload,
  removePhotoById,
  removeSelectedFile,
  validateImageFiles,
  validateVipPosition,
} from '../utils/resourceForm.js'

const VIP_PROVIDER_LABELS = {
  photographer: 'ფოტოგრაფი',
  videographer: 'ვიდეოგრაფი',
  band: 'ბენდი',
  dj: 'დიჯეი',
  presenter: 'წამყვანი',
  studio: 'სტუდია',
}

function sortVips(items) {
  return [...items].sort(
    (leftItem, rightItem) =>
      Number(leftItem?.provider?.vip_order ?? Number.MAX_SAFE_INTEGER) -
      Number(rightItem?.provider?.vip_order ?? Number.MAX_SAFE_INTEGER),
  )
}

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

function ProviderImage({ src, alt = '', className = '' }) {
  const [failedSrc, setFailedSrc] = useState('')

  if (!src || failedSrc === src) {
    return (
      <div
        className={`image-placeholder ${className}`.trim()}
        role="img"
        aria-label={alt || 'No image'}
      >
        No image
      </div>
    )
  }

  return (
    <img
      className={className}
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailedSrc(src)}
    />
  )
}

function VipOrderPanel({ items, isLoading, error }) {
  return (
    <section className="vip-order-card" aria-labelledby="vip-order-title">
      <div className="vip-order-head">
        <div>
          <h3 id="vip-order-title">VIP order</h3>
          <p>ყველა კატეგორიის საერთო VIP პოზიციები</p>
        </div>
        <span className="vip-order-count">
          {isLoading ? 'იტვირთება...' : `${items.length} VIP`}
        </span>
      </div>

      {error ? <div className="form-error">{error}</div> : null}

      {isLoading ? (
        <div className="vip-order-empty">VIP სია იტვირთება...</div>
      ) : items.length === 0 ? (
        <div className="vip-order-empty">VIP პოზიციები ჯერ არ არის დაკავებული.</div>
      ) : (
        <div className="vip-order-list">
          {items.map((item) => {
            const provider = item.provider ?? {}
            const providerType = VIP_PROVIDER_LABELS[item.provider_type] ?? item.provider_type
            const providerName =
              getTranslatedValue(provider.name, 'ka') ||
              getTranslatedValue(provider.name, 'en') ||
              `${providerType} #${provider.id}`

            return (
              <article
                key={`${item.provider_type}-${provider.id}`}
                className="vip-order-item"
              >
                <span className="vip-position-badge">#{provider.vip_order}</span>
                <ProviderImage
                  className="vip-provider-image"
                  src={provider.profile_photo_url}
                  alt={`${providerName} — ${providerType}`}
                />
                <div className="vip-provider-copy">
                  <span>{providerType}</span>
                  <strong>{providerName}</strong>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

function renderCurrentAsset(
  field,
  item,
  existingAssets,
  onRequestPhotoDelete,
  deletingPhotoId,
  imageAltBase,
) {
  const value = existingAssets?.[field.name] ?? item?.[field.name]

  if (field.type === 'files' && Array.isArray(value)) {
    return (
      <div className="asset-preview-block">
        <p className="field-help">
          მიმდინარე გალერეა: {value.length} ფოტო
        </p>
        {value.length > 0 ? (
          <div className="asset-preview-grid">
            {value.map((asset, index) => {
              const isDeleting = String(deletingPhotoId) === String(asset?.id)

              return (
                <div
                  key={asset?.id ?? index}
                  className={`asset-preview-item${isDeleting ? ' asset-preview-item-loading' : ''}`}
                  aria-busy={isDeleting}
                >
                  <ProviderImage
                    className="asset-preview-thumb"
                    src={asset?.photo_url}
                    alt={`${imageAltBase} — გალერეის ფოტო ${index + 1}`}
                  />
                  {isDeleting ? <span className="asset-loading-label">იშლება...</span> : null}
                  {asset?.id ? (
                    <button
                      className="asset-remove-button"
                      type="button"
                      aria-label={`${imageAltBase}-ის გალერეის ფოტო ${index + 1}-ის წაშლა`}
                      title="ფოტოს წაშლა"
                      disabled={isDeleting}
                      onClick={() => onRequestPhotoDelete(field, asset, index)}
                    >
                      {isDeleting ? '…' : '×'}
                    </button>
                  ) : null}
                </div>
              )
            })}
          </div>
        ) : null}
      </div>
    )
  }

  if (field.type === 'file') {
    const previewUrl = item?.[`${field.name}_url`]

    if (!value && !previewUrl) {
      return null
    }

    return (
      <div className="asset-preview-block">
        <p className="field-help">მიმდინარე ფოტო</p>
        <ProviderImage
          className="asset-preview-thumb asset-preview-single"
          src={previewUrl}
          alt={`${imageAltBase} — ${field.label}`}
        />
      </div>
    )
  }

  return null
}

function SelectedImagePreview({ selection, alt, removeLabel, onRemove }) {
  useEffect(() => {
    const previewUrl = selection.previewUrl

    return () => URL.revokeObjectURL(previewUrl)
  }, [selection.previewUrl])

  return (
    <div className="asset-preview-item">
      <ProviderImage
        className="asset-preview-thumb"
        src={selection.previewUrl}
        alt={alt}
      />
      <span className="asset-preview-name" title={selection.file.name}>
        {selection.file.name}
      </span>
      <button
        className="asset-remove-button"
        type="button"
        aria-label={removeLabel}
        title="არჩეული ფოტოს ამოღება"
        onClick={onRemove}
      >
        ×
      </button>
    </div>
  )
}

function SelectedFilePreviews({ field, value, imageAltBase, onRemove }) {
  const selections = field.type === 'file' ? (value ? [value] : []) : value

  if (!Array.isArray(selections) || selections.length === 0) {
    return null
  }

  return (
    <div className="asset-preview-block selected-assets-block">
      <p className="field-help">
        {field.type === 'files'
          ? `ახალი ფოტოები: ${selections.length}`
          : 'ახალი პროფილის ფოტო'}
      </p>
      <div className="asset-preview-grid">
        {selections.map((selection, index) => (
          <SelectedImagePreview
            key={selection.previewUrl}
            selection={selection}
            alt={`${imageAltBase} — ახალი ${field.label} ${index + 1}`}
            removeLabel={`${selection.file.name}-ის ამოღება`}
            onRemove={() => onRemove(field.name, index)}
          />
        ))}
      </div>
    </div>
  )
}

function ResourceForm({
  activeItem,
  existingAssets,
  resource,
  formValues,
  formError,
  fieldErrors,
  isSaving,
  deletingPhotoId,
  onChange,
  onRemoveSelectedFile,
  onRequestPhotoDelete,
  onSubmit,
  onCancel,
}) {
  const imageAltBase = resource.key === 'rental-cars'
    ? [formValues.mark, formValues.model].filter(Boolean).join(' ') || resource.singularLabel
    : activeItem
      ? getResourceItemTitle(resource, activeItem, 'ka')
      : resource.singularLabel

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
            if (field.name === 'vip_order' && !formValues.vip) {
              return null
            }

            const isWideField =
              field.type.includes('textarea') || field.type === 'list' || field.type === 'files'
            const rawFieldError = fieldErrors[field.name]
            const fieldError = Array.isArray(rawFieldError)
              ? rawFieldError[0]
              : rawFieldError

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
                      deletingPhotoId,
                      imageAltBase,
                    )}
                    <SelectedFilePreviews
                      field={field}
                      value={formValues[field.name]}
                      imageAltBase={imageAltBase}
                      onRemove={onRemoveSelectedFile}
                    />
                    <p className="field-help">მხოლოდ გამოსახულება, მაქსიმუმ 10 MB.</p>
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
                    min={field.min}
                    step={field.step}
                    value={formValues[field.name]}
                    onChange={onChange}
                    placeholder={`შეიყვანეთ ${field.label.toLowerCase()}`}
                    required={field.required || (field.name === 'vip_order' && formValues.vip)}
                    aria-invalid={Boolean(fieldError)}
                    aria-describedby={fieldError ? `${field.name}-error` : undefined}
                  />
                )}
                {fieldError ? (
                  <p className="field-error" id={`${field.name}-error`} role="alert">
                    {fieldError}
                  </p>
                ) : null}
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

function formatTableValue(field, item, displayLanguage, resource) {
  const value = item[field.name]

  if (field.type.startsWith('translated-')) {
    return getTranslatedValue(value, displayLanguage) || '-'
  }

  if (field.type === 'boolean') {
    return <span className={value ? 'status-badge status-vip' : 'status-badge'}>{value ? 'VIP' : 'სტანდარტული'}</span>
  }

  if (field.type === 'file') {
    const itemTitle = getResourceItemTitle(resource, item, displayLanguage)

    return (
      <ProviderImage
        className="table-thumbnail"
        src={item[`${field.name}_url`]}
        alt={`${itemTitle} — ${field.label}`}
      />
    )
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
  const supportsVip = resource?.fields.some((field) => field.name === 'vip') ?? false
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [formError, setFormError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [vips, setVips] = useState([])
  const [isVipsLoading, setIsVipsLoading] = useState(supportsVip)
  const [vipListError, setVipListError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [pendingPhotoDelete, setPendingPhotoDelete] = useState(null)
  const [photoDeleteError, setPhotoDeleteError] = useState('')
  const [deletingPhotoId, setDeletingPhotoId] = useState(null)
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

  useEffect(() => {
    if (!supportsVip) {
      return
    }

    let isCancelled = false

    async function loadVips() {
      setIsVipsLoading(true)
      setVipListError('')

      try {
        const nextVips = await fetchVips()

        if (!isCancelled) {
          setVips(sortVips(nextVips))
        }
      } catch (error) {
        if (!isCancelled) {
          setVipListError(error.message)
        }
      } finally {
        if (!isCancelled) {
          setIsVipsLoading(false)
        }
      }
    }

    loadVips()

    return () => {
      isCancelled = true
    }
  }, [supportsVip, resourceKey])

  if (!resource) {
    return null
  }

  const tableFields = resource.fields
    .filter((field) => field.table)
    .sort(
      (leftField, rightField) =>
        Number(rightField.name === 'profile_photo') -
        Number(leftField.name === 'profile_photo'),
    )
  const activeItem = items.find((item) => item.id === activeItemId) ?? null
  const isDeletingPhoto = deletingPhotoId !== null

  async function refreshVipItems() {
    if (!supportsVip) {
      return
    }

    setVipListError('')

    try {
      setVips(sortVips(await fetchVips()))
    } catch (error) {
      setVipListError(error.message)
    }
  }

  function handleCreateClick() {
    setIsEditorOpen(true)
    setActiveItemId(null)
    setExistingAssets({})
    setFormValues(createInitialFormValues(resource))
    setFormError('')
    setFieldErrors({})
    setPendingPhotoDelete(null)
    setPhotoDeleteError('')
  }

  function handleRequestPhotoDelete(field, photo, index) {
    setPendingPhotoDelete({ field, photo, index })
    setPhotoDeleteError('')
  }

  function handleCancelPhotoDelete() {
    if (deletingPhotoId !== null) {
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
    setDeletingPhotoId(photo.id)
    setPhotoDeleteError('')

    try {
      const result = await deleteResourcePhoto(resource, activeItem.id, photo.id)
      const deletedPhotoId = result?.deleted_photo_id ?? photo.id

      setExistingAssets((current) => ({
        ...current,
        [field.name]: removePhotoById(current[field.name] ?? [], deletedPhotoId),
      }))
      setItems((current) =>
        current.map((item) =>
          item.id === activeItem.id
            ? {
                ...item,
                [field.name]: removePhotoById(item[field.name], deletedPhotoId),
              }
            : item,
        ),
      )
      setPendingPhotoDelete(null)
    } catch (error) {
      setPhotoDeleteError(error.message)
    } finally {
      setDeletingPhotoId(null)
    }
  }

  function handleFieldChange(event) {
    const { checked, dataset, files, name, type, value, multiple } = event.target

    setFieldErrors((current) => {
      const nextErrors = { ...current }

      delete nextErrors[name]

      if (dataset.language) {
        delete nextErrors[`${name}.${dataset.language}`]
      }

      if (name === 'vip' && !checked) {
        delete nextErrors.vip_order
      }

      return nextErrors
    })
    setFormError('')

    if (type === 'file') {
      const selectedFiles = Array.from(files ?? [])
      const validationError = validateImageFiles(selectedFiles)

      event.target.value = ''

      if (validationError) {
        setFormError(validationError)
        return
      }

      const selections = selectedFiles.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      }))

      setFormValues((current) => ({
        ...current,
        [name]: multiple
          ? [...(current[name] ?? []), ...selections]
          : (selections[0] ?? null),
      }))
      setFormError('')
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
        ...(name === 'vip' && !checked ? { vip_order: '' } : {}),
      }))
      return
    }

    setFormValues((current) => ({
      ...current,
      [name]: value,
    }))
  }

  function handleRemoveSelectedFile(fieldName, index) {
    setFormValues((current) => removeSelectedFile(current, fieldName, index))
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
    setItems((current) =>
      current.map((entry) =>
        entry.id === detailedItem.id ? { ...entry, ...detailedItem } : entry,
      ),
    )
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
    setFieldErrors({})
  }

  function handleCloseEditor() {
    setIsEditorOpen(false)
    setActiveItemId(null)
    setExistingAssets({})
    setFormValues(createInitialFormValues(resource))
    setFormError('')
    setFieldErrors({})
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

      await refreshVipItems()
    } catch (error) {
      setPageError(error.message)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const validationError = validateTranslatedFields(resource, formValues)
    const vipPositionError = validateVipPosition(formValues)

    if (validationError) {
      setFormError(validationError)
      return
    }

    if (vipPositionError) {
      setFormError('')
      setFieldErrors({ vip_order: [vipPositionError] })
      return
    }

    setIsSaving(true)
    setFormError('')
    setFieldErrors({})

    const payload = createMultipartPayload(resource, formValues)

    try {
      const savedItem = activeItem
        ? await updateResourceItem(resource, activeItem.id, payload)
        : await createResourceItem(resource, payload)

      const responseItem = savedItem?.data ?? savedItem
      const nextItem = activeItem
        ? { ...activeItem, ...responseItem }
        : responseItem

      if (activeItem) {
        resource.fields
          .filter((field) => field.type === 'files')
          .forEach((field) => {
            if (!Array.isArray(responseItem?.[field.name])) {
              nextItem[field.name] = existingAssets[field.name] ?? []
            }
          })
      }

      setItems((current) => {
        if (activeItem) {
          return current.map((item) => (item.id === activeItem.id ? nextItem : item))
        }

        return [nextItem, ...current]
      })

      await refreshVipItems()
      handleCloseEditor()
    } catch (error) {
      const validationErrors = error.validationErrors ?? {}

      setFieldErrors(validationErrors)
      setFormError(validationErrors.vip_order ? '' : error.message)
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

      {supportsVip ? (
        <VipOrderPanel
          items={vips}
          isLoading={isVipsLoading}
          error={vipListError}
        />
      ) : null}

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
                          <td key={field.name}>
                            {formatTableValue(field, item, displayLanguage, resource)}
                          </td>
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
                          <dd>{formatTableValue(field, item, displayLanguage, resource)}</dd>
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
              fieldErrors={fieldErrors}
              isSaving={isSaving}
              deletingPhotoId={deletingPhotoId}
              onChange={handleFieldChange}
              onRemoveSelectedFile={handleRemoveSelectedFile}
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
              ნამდვილად გსურთ გალერეიდან ფოტოს წაშლა?
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
