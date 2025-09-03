/**
 * HTML Field Parser Utility
 * Parses HTML content to extract and replace amtelco_nxt_field placeholders
 */

export interface ParsedField {
  type: string           // e.g., 'CFld'
  fieldName: string      // e.g., 'Main Office Number'
  fieldId: number        // e.g., 17 (cltfieldID)
  fullMatch: string      // e.g., 'CFld.Main Office Number.17'
  placeholder: string    // e.g., '[CFld.Main Office Number.17]'
  attributeValue: string // e.g., 'CFld.Main Office Number.17'
}

export interface FieldReplacement {
  fieldId: number
  placeholder: string
  value: string
  replaced: boolean
}

export interface ParsingResult {
  fields: ParsedField[]
  replacements: FieldReplacement[]
  totalFields: number
  processedHtml: string
  errors: string[]
}

/**
 * Extracts amtelco_nxt_field attributes and placeholders from HTML
 */
export function extractFields(html: string): ParsedField[] {
  const fields: ParsedField[] = []
  const fieldSet = new Set<string>() // Prevent duplicates
  
  // Regex to find amtelco_nxt_field attributes
  const attributeRegex = /amtelco_nxt_field=["']([^"']+)["']/gi
  
  // Regex to find bracket placeholders
  const placeholderRegex = /\[([^\]]+)\]/g
  
  let match
  
  // Extract fields from amtelco_nxt_field attributes
  while ((match = attributeRegex.exec(html)) !== null) {
    const attributeValue = match[1]
    
    if (!fieldSet.has(attributeValue)) {
      const parsedField = parseFieldAttribute(attributeValue, attributeValue)
      if (parsedField) {
        fields.push(parsedField)
        fieldSet.add(attributeValue)
      }
    }
  }
  
  // Extract fields from bracket placeholders
  while ((match = placeholderRegex.exec(html)) !== null) {
    const placeholder = match[1]
    
    if (!fieldSet.has(placeholder)) {
      const parsedField = parseFieldAttribute(placeholder, `[${placeholder}]`)
      if (parsedField) {
        fields.push(parsedField)
        fieldSet.add(placeholder)
      }
    }
  }
  
  return fields
}

/**
 * Parses a field attribute value into components
 * Format: "CFld.Field Name.ID" or similar
 */
function parseFieldAttribute(attributeValue: string, placeholder: string): ParsedField | null {
  // Split by periods, but handle field names that might contain periods
  const parts = attributeValue.split('.')
  
  if (parts.length < 3) {
    return null // Invalid format
  }
  
  // First part is type, last part is ID, everything in between is field name
  const type = parts[0]
  const fieldIdStr = parts[parts.length - 1]
  const fieldName = parts.slice(1, -1).join('.')
  
  // Validate field ID is a number
  const fieldId = parseInt(fieldIdStr, 10)
  if (isNaN(fieldId)) {
    return null
  }
  
  return {
    type,
    fieldName,
    fieldId,
    fullMatch: attributeValue,
    placeholder,
    attributeValue
  }
}

/**
 * Replaces field placeholders in HTML with actual values
 */
export function replaceFields(
  html: string, 
  fieldValues: Map<number, string>
): ParsingResult {
  const fields = extractFields(html)
  const replacements: FieldReplacement[] = []
  const errors: string[] = []
  
  let processedHtml = html
  
  // Process each field
  for (const field of fields) {
    const fieldValue = fieldValues.get(field.fieldId)
    const replacement: FieldReplacement = {
      fieldId: field.fieldId,
      placeholder: field.placeholder,
      value: fieldValue || field.placeholder, // Keep placeholder if no value found
      replaced: fieldValue !== undefined
    }
    
    if (fieldValue !== undefined) {
      // HTML encode the field value to prevent XSS
      const encodedValue = htmlEncode(fieldValue)
      
      // Replace both bracket placeholders and text content between HTML tags
      processedHtml = processedHtml.replace(
        new RegExp(`\\[${escapeRegex(field.fullMatch)}\\]`, 'g'),
        encodedValue
      )
    } else {
      errors.push(`Field not found: ${field.fullMatch}`)
    }
    
    replacements.push(replacement)
  }
  
  return {
    fields,
    replacements,
    totalFields: fields.length,
    processedHtml,
    errors
  }
}

/**
 * HTML encode a string to prevent XSS attacks
 */
function htmlEncode(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Get unique field IDs from parsed fields
 */
export function getFieldIds(fields: ParsedField[]): number[] {
  const fieldIds = new Set<number>()
  fields.forEach(field => fieldIds.add(field.fieldId))
  return Array.from(fieldIds)
}