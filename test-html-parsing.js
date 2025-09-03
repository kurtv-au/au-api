/**
 * Test script for HTML field parsing functionality
 * Run with: node test-html-parsing.js
 */

// Import the HTML parser functions (we'll need to adjust the path for Node.js)
const { extractFields, replaceFields, getFieldIds } = require('./server/utils/htmlFieldParser')

// Test HTML content with amtelco_nxt_field attributes and placeholders
const testHtml = `
<div class="client-info">
  <h2>Client Information</h2>
  <p>
    <strong>Main Office:</strong> 
    <span contenteditable="false" amtelco_nxt_field="CFld.Main Office Number.17">
      [CFld.Main Office Number.17]
    </span>
  </p>
  <p>
    <strong>Email:</strong> 
    <span contenteditable="false" amtelco_nxt_field="CFld.Email Address.25">
      [CFld.Email Address.25]
    </span>
  </p>
  <p>
    <strong>Website:</strong> 
    [CFld.Website.42]
  </p>
  <p>
    <strong>Notes:</strong> 
    <span amtelco_nxt_field="CFld.Special Instructions.99">
      [CFld.Special Instructions.99]
    </span>
  </p>
</div>
`

console.log('Testing HTML Field Parser')
console.log('==========================')

// Test field extraction
console.log('\n1. Extracting fields from HTML:')
const fields = extractFields(testHtml)
console.log(`Found ${fields.length} fields:`)

fields.forEach((field, index) => {
  console.log(`  ${index + 1}. ${field.fullMatch}`)
  console.log(`     Type: ${field.type}`)
  console.log(`     Field Name: ${field.fieldName}`)
  console.log(`     Field ID: ${field.fieldId}`)
  console.log(`     Placeholder: ${field.placeholder}`)
})

// Test field ID extraction
console.log('\n2. Extracting unique field IDs:')
const fieldIds = getFieldIds(fields)
console.log('Field IDs:', fieldIds)

// Test field replacement with mock values (including values with whitespace to test trimming)
console.log('\n3. Testing field replacement:')
const mockFieldValues = new Map([
  [17, '  (555) 123-4567  '], // Test trimming with spaces
  [25, '\tinfo@example.com\n'], // Test trimming with tab and newline
  [42, '   https://www.example.com   '], // Test trimming with multiple spaces
  // Intentionally missing field 99 to test missing field handling
])

console.log('Mock values (before processing):')
mockFieldValues.forEach((value, id) => {
  console.log(`  Field ${id}: "${value}" (length: ${value.length})`)
})

const result = replaceFields(testHtml, mockFieldValues)

console.log(`Total fields: ${result.totalFields}`)
console.log(`Replacements made: ${result.replacements.filter(r => r.replaced).length}`)
console.log(`Errors: ${result.errors.length}`)

if (result.errors.length > 0) {
  console.log('Errors:')
  result.errors.forEach(error => console.log(`  - ${error}`))
}

console.log('\n4. Processed HTML:')
console.log('-------------------')
console.log(result.processedHtml)

console.log('\n5. Replacement details:')
result.replacements.forEach((replacement, index) => {
  console.log(`  ${index + 1}. Field ${replacement.fieldId}: ${replacement.replaced ? 'SUCCESS' : 'MISSING'}`)
  console.log(`     Placeholder: ${replacement.placeholder}`)
  console.log(`     Value: "${replacement.value}" (length: ${replacement.value.length})`)
  if (replacement.replaced) {
    const originalValue = mockFieldValues.get(replacement.fieldId)
    if (originalValue && originalValue !== replacement.value) {
      console.log(`     Original: "${originalValue}" (trimmed: ${originalValue.length - replacement.value.length} chars removed)`)
    }
  }
})

console.log('\nTest completed!')