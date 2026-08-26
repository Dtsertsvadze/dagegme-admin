/**
 * @typedef {'en' | 'ka'} Language
 * @typedef {{ en: string, ka: string }} Translation
 * @typedef {{ id: number, photo_path: string, photo_url?: string | null }} GalleryPhoto
 * @typedef {{
 *   id: number,
 *   name?: Translation,
 *   description?: Translation | null,
 *   city?: Translation,
 *   profile_photo?: string | null,
 *   profile_photo_url?: string | null,
 *   links?: string[],
 *   vip?: boolean,
 *   photos?: GalleryPhoto[],
 *   mark?: string,
 *   model?: string,
 *   year?: number
 * }} ResourceItem
 */

const translatedText = (name, label, options = {}) => ({
  name,
  label,
  type: "translated-text",
  ...options,
});

const translatedTextarea = (name, label, options = {}) => ({
  name,
  label,
  type: "translated-textarea",
  ...options,
});

const vipField = { name: "vip", label: "VIP", type: "boolean", table: true };

export const adminResources = [
  {
    key: "photographers",
    label: "ფოტოგრაფები",
    singularLabel: "ფოტოგრაფი",
    publicPath: "/photographers",
    adminPath: "/admin/photographers",
    titleField: "name",
    fields: [
      translatedText("name", "სახელი", { required: true, table: true }),
      translatedText("city", "ქალაქი", { required: true, table: true }),
      vipField,
      {
        name: "profile_photo",
        label: "პროფილის ფოტო",
        type: "file",
        accept: "image/*",
      },
      translatedTextarea("description", "აღწერა"),
      { name: "links", label: "ბმულები", type: "list" },
      {
        name: "photos",
        label: "გალერეის ფოტოები",
        type: "files",
        accept: "image/*",
        existingFieldName: "existing_photos",
      },
    ],
  },
  {
    key: "videographers",
    label: "ვიდეოგრაფები",
    singularLabel: "ვიდეოგრაფი",
    publicPath: "/videographers",
    adminPath: "/admin/videographers",
    titleField: "name",
    fields: [
      translatedText("name", "სახელი", { required: true, table: true }),
      translatedText("city", "ქალაქი", { required: true, table: true }),
      vipField,
      {
        name: "profile_photo",
        label: "პროფილის ფოტო",
        type: "file",
        accept: "image/*",
      },
      translatedTextarea("description", "აღწერა"),
      { name: "links", label: "ბმულები", type: "list" },
    ],
  },
  {
    key: "bands",
    label: "ბენდები",
    singularLabel: "ბენდი",
    publicPath: "/bands",
    adminPath: "/admin/bands",
    titleField: "name",
    fields: [
      translatedText("name", "სახელი", { required: true, table: true }),
      translatedText("city", "ქალაქი", { required: true, table: true }),
      vipField,
      {
        name: "profile_photo",
        label: "პროფილის ფოტო",
        type: "file",
        accept: "image/*",
      },
      translatedTextarea("description", "აღწერა"),
      { name: "links", label: "ბმულები", type: "list" },
    ],
  },
  {
    key: "djs",
    label: "დიჯეები",
    singularLabel: "დიჯეი",
    publicPath: "/djs",
    adminPath: "/admin/djs",
    titleField: "name",
    fields: [
      translatedText("name", "სახელი", { required: true, table: true }),
      translatedText("city", "ქალაქი", { required: true, table: true }),
      vipField,
      {
        name: "profile_photo",
        label: "პროფილის ფოტო",
        type: "file",
        accept: "image/*",
      },
      translatedTextarea("description", "აღწერა"),
      { name: "links", label: "ბმულები", type: "list" },
    ],
  },
  {
    key: "presenters",
    label: "წამყვანები",
    singularLabel: "წამყვანი",
    publicPath: "/presenters",
    adminPath: "/admin/presenters",
    titleField: "name",
    fields: [
      translatedText("name", "სახელი", { required: true, table: true }),
      translatedText("city", "ქალაქი", { required: true, table: true }),
      vipField,
      {
        name: "profile_photo",
        label: "პროფილის ფოტო",
        type: "file",
        accept: "image/*",
      },
      translatedTextarea("description", "აღწერა"),
    ],
  },
  {
    key: "studios",
    label: "სტუდიები",
    singularLabel: "სტუდია",
    publicPath: "/studios",
    adminPath: "/admin/studios",
    titleField: "name",
    fields: [
      translatedText("name", "სახელი", { required: true, table: true }),
      translatedText("city", "ქალაქი", { required: true, table: true }),
      vipField,
      {
        name: "profile_photo",
        label: "პროფილის ფოტო",
        type: "file",
        accept: "image/*",
      },
      translatedTextarea("description", "აღწერა"),
    ],
  },
  {
    key: "rental-cars",
    label: "ავტომობილები",
    singularLabel: "ავტომობილი",
    publicPath: "/rental-cars",
    adminPath: "/admin/rental-cars",
    fields: [
      {
        name: "mark",
        label: "მარკა",
        type: "text",
        required: true,
        table: true,
      },
      {
        name: "model",
        label: "მოდელი",
        type: "text",
        required: true,
        table: true,
      },
      {
        name: "year",
        label: "წელი",
        type: "number",
        required: true,
        table: true,
      },
      translatedText("city", "ქალაქი", { required: true, table: true }),
      {
        name: "profile_photo",
        label: "პროფილის ფოტო",
        type: "file",
        accept: "image/*",
        table: true,
      },
      {
        name: "photos",
        label: "გალერეის ფოტოები",
        type: "files",
        accept: "image/*",
      },
    ],
  },
];

export function getResourceDefinition(resourceKey) {
  return (
    adminResources.find((resource) => resource.key === resourceKey) ?? null
  );
}

export function getTranslatedValue(value, language = "en") {
  if (!value || typeof value !== "object") {
    return typeof value === "string" ? value : "";
  }

  return value[language] ?? "";
}

export function getResourceItemTitle(resource, item, language = "en") {
  if (resource.key === "rental-cars") {
    return [item.mark, item.model, item.year].filter(Boolean).join(" ");
  }

  return (
    getTranslatedValue(item[resource.titleField], language) ||
    `${resource.singularLabel} #${item.id}`
  );
}

export function createInitialFormValues(resource) {
  return resource.fields.reduce((values, field) => {
    if (field.type.startsWith("translated-")) {
      values[field.name] = { en: "", ka: "" };
      return values;
    }

    if (field.type === "file") {
      values[field.name] = null;
      return values;
    }

    if (field.type === "files") {
      values[field.name] = [];
      return values;
    }

    if (field.type === "boolean") {
      values[field.name] = false;
      return values;
    }

    values[field.name] = "";
    return values;
  }, {});
}
