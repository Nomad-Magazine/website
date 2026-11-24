import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {Record<string, string>} */
let choiceLabels = null

export function loadDirectoryCategoryChoices() {
  if (!choiceLabels) {
    const choicesPath = path.resolve(__dirname, '../src/utils/directory-category-choices.json')
    choiceLabels = JSON.parse(readFileSync(choicesPath, 'utf-8'))
  }
  return choiceLabels
}

/**
 * SmartSuite single-select may be `{ label, value }` or a bare choice id string.
 * @param {unknown} field
 * @returns {{ label: string, value: string } | undefined}
 */
export function normalizeDirectoryCategoryField(field) {
  if (field == null || field === '') return undefined
  if (typeof field === 'object' && field !== null && 'label' in field && 'value' in field) {
    const { label, value } = field
    if (label && value) return { label: String(label), value: String(value) }
  }

  const choices = loadDirectoryCategoryChoices()
  const value = typeof field === 'string' ? field : typeof field === 'object' && field && 'value' in field ? String(field.value) : ''
  if (!value) return undefined

  const label = choices[value]
  if (!label) {
    console.warn(`Unknown directory category choice id: ${value}`)
    return undefined
  }
  return { label, value }
}

/** @param {Record<string, unknown>} record */
export function normalizeRecordCategoryField(record) {
  const field = record.sb685ab800
  if (field && typeof field === 'object' && field.label && field.value) return
  const normalized = normalizeDirectoryCategoryField(field)
  if (normalized) record.sb685ab800 = normalized
}