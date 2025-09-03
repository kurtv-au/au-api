/**
 * Field Resolver Service
 * Handles database lookups for dirListingFields to resolve field values
 */

import { query } from './database'
import { transformRecordset } from './caseMapper'
import type { DirListingField, FieldProcessingResult } from '../types/database'
import { extractFields, replaceFields, getFieldIds, type ParsedField, type ParsingResult } from './htmlFieldParser'

/**
 * Resolves field values for a single client's HTML content
 */
export async function resolveClientFields(
  html: string, 
  cltId: number
): Promise<ParsingResult> {
  try {
    // Extract all fields from HTML
    const fields = extractFields(html)
    
    if (fields.length === 0) {
      return {
        fields: [],
        replacements: [],
        totalFields: 0,
        processedHtml: html,
        errors: []
      }
    }
    
    // Get unique field IDs
    const fieldIds = getFieldIds(fields)
    
    // Batch query to get all field values
    const fieldValues = await batchGetFieldValues(cltId, fieldIds)
    
    // Replace fields in HTML
    const result = replaceFields(html, fieldValues)
    
    return result
    
  } catch (error: any) {
    return {
      fields: [],
      replacements: [],
      totalFields: 0,
      processedHtml: html,
      errors: [`Field resolution failed: ${error.message}`]
    }
  }
}

/**
 * Batch lookup field values from database
 */
async function batchGetFieldValues(
  cltId: number, 
  fieldIds: number[]
): Promise<Map<number, string>> {
  const fieldValues = new Map<number, string>()
  
  if (fieldIds.length === 0) {
    return fieldValues
  }
  
  try {
    // Build parameterized query for batch lookup
    const placeholders = fieldIds.map((_, index) => `@fieldId${index}`).join(',')
    
    const sqlQuery = `
      SELECT cltfieldID, Field 
      FROM dbo.dirListingFields 
      WHERE cltID = @cltId 
        AND cltfieldID IN (${placeholders})
        AND Field IS NOT NULL
    `
    
    // Build parameters object
    const params: Record<string, any> = { cltId }
    fieldIds.forEach((fieldId, index) => {
      params[`fieldId${index}`] = fieldId
    })
    
    // Execute query and transform to camelCase
    const result = await query(sqlQuery, params)
    const transformedResults = transformRecordset<DirListingField>(result.recordset)
    
    // Map results by fieldId (trim all field values)
    transformedResults.forEach(row => {
      if (row.cltfieldID !== null && row.field) {
        fieldValues.set(row.cltfieldID, row.field.trim())
      }
    })
    
  } catch (error: any) {
    console.error('Field lookup error:', error)
    // Return empty map on error - fields will remain as placeholders
  }
  
  return fieldValues
}

/**
 * Processes multiple client info records with field resolution
 * Updated to work with camelCase properties
 */
export async function resolveMultipleClientFields(
  clientInfoList: Array<{ info: string | null, cltId: number, [key: string]: any }>
): Promise<Array<{ processedInfo?: string, fieldProcessing?: FieldProcessingResult, [key: string]: any }>> {
  const results = []
  
  for (const clientInfo of clientInfoList) {
    const processed = { ...clientInfo }
    
    if (clientInfo.info) {
      try {
        const parsingResult = await resolveClientFields(clientInfo.info, clientInfo.cltId)
        
        processed.processedInfo = parsingResult.processedHtml
        processed.fieldProcessing = {
          totalFields: parsingResult.totalFields,
          replacedFields: parsingResult.replacements.filter(r => r.replaced).length,
          missingFields: parsingResult.errors
        }
        
      } catch (error: any) {
        console.error(`Field processing error for cltId ${clientInfo.cltId}:`, error)
        processed.fieldProcessing = {
          totalFields: 0,
          replacedFields: 0,
          missingFields: [`Processing failed: ${error.message}`]
        }
      }
    }
    
    results.push(processed)
  }
  
  return results
}

/**
 * Get field usage statistics for a client
 */
export async function getFieldUsageStats(cltId: number): Promise<{
  totalAvailableFields: number
  fieldsByDataType: Record<number, number>
  topFields: Array<{ fieldId: number, fieldName: string, dataType: number }>
}> {
  try {
    // Get all fields for the client and transform to camelCase
    const result = await query(`
      SELECT cltfieldID, Field, DataType, COUNT(*) as usage_count
      FROM dbo.dirListingFields 
      WHERE cltID = @cltId 
        AND cltfieldID IS NOT NULL
        AND Field IS NOT NULL
      GROUP BY cltfieldID, Field, DataType
      ORDER BY usage_count DESC, Field
    `, { cltId })
    
    const fields = transformRecordset<DirListingField>(result.recordset)
    const fieldsByDataType: Record<number, number> = {}
    
    // Count fields by data type
    fields.forEach(field => {
      fieldsByDataType[field.dataType] = (fieldsByDataType[field.dataType] || 0) + 1
    })
    
    // Top 10 most common fields
    const topFields = fields.slice(0, 10).map(field => ({
      fieldId: field.cltfieldID!,
      fieldName: field.field,
      dataType: field.dataType
    }))
    
    return {
      totalAvailableFields: fields.length,
      fieldsByDataType,
      topFields
    }
    
  } catch (error: any) {
    console.error('Field stats error:', error)
    return {
      totalAvailableFields: 0,
      fieldsByDataType: {},
      topFields: []
    }
  }
}