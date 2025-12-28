/**
 * Configuration Lookup System
 *
 * Handles database lookups for mapping configurations (INSURED, BENEF, RELATION, etc.)
 * Supports caching for performance optimization
 */

import { sql } from './db.js';

// In-memory cache (15 minutes TTL)
const configCache = new Map();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

/**
 * Get configuration value from database with caching
 * @param {String} configKey - Configuration key (e.g., "INSURED", "MARISTATUS")
 * @param {String} input - Input value to lookup (AS400 code)
 * @param {String} systemType - System type (default: "NL" for New Life)
 * @returns {Promise<String|null>} - Output value (BPM value) or null
 */
async function getConfigValue(configKey, input, systemType = 'NL') {
  console.log('🔍 [getConfigValue] Called with:', {
    configKey,
    input,
    systemType,
    inputType: typeof input
  });

  if (!configKey || !input) {
    console.log('⚠️ [getConfigValue] Missing configKey or input, returning null');
    return null;
  }

  // Check cache first
  const cacheKey = `${configKey}:${input}:${systemType}`;
  const cached = configCache.get(cacheKey);

  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    console.log('✅ [getConfigValue] Cache hit:', { cacheKey, value: cached.value });
    return cached.value;
  }

  console.log('🔍 [getConfigValue] Cache miss, querying database...');

  try {
    // Query database (using existing table: bpm_soap_bocaller_parameters)
    const result = await sql`
      SELECT output
      FROM bpm_soap_bocaller_parameters
      WHERE bpm_key = ${configKey}
        AND input = ${input}
        AND system_type = ${systemType}
      LIMIT 1
    `;

    console.log('🔍 [getConfigValue] Query result:', {
      rowCount: result.rows.length,
      rows: result.rows
    });

    const value = result.rows.length > 0 ? result.rows[0].output : null;

    console.log('🔍 [getConfigValue] Extracted value:', { value });

    // Cache result
    configCache.set(cacheKey, {
      value,
      timestamp: Date.now()
    });

    console.log('✅ [getConfigValue] Returning:', { value });
    return value;
  } catch (error) {
    console.error('❌ [getConfigValue] Config lookup error:', error);
    return null;
  }
}

/**
 * Get all configuration values for a key (for dropdown population, etc.)
 * @param {String} configKey - Configuration key
 * @param {String} systemType - System type
 * @returns {Promise<Array>} - Array of {input, output} objects
 */
async function getAllConfigValues(configKey, systemType = 'NL') {
  try {
    const result = await sql`
      SELECT input, output, remark as description
      FROM bpm_soap_bocaller_parameters
      WHERE bpm_key = ${configKey}
        AND system_type = ${systemType}
      ORDER BY input
    `;

    return result.rows;
  } catch (error) {
    console.error('Config get all error:', error);
    return [];
  }
}

/**
 * Set configuration value
 * @param {String} configKey - Configuration key
 * @param {String} input - AS400 input code
 * @param {String} output - BPM output value
 * @param {String} systemType - System type
 * @param {String} description - Optional description
 */
async function setConfigValue(configKey, input, output, systemType = 'NL', description = null) {
  try {
    await sql`
      INSERT INTO bpm_soap_bocaller_parameters
      (bpm_key, input, output, system_type, remark)
      VALUES (${configKey}, ${input}, ${output}, ${systemType}, ${description})
      ON CONFLICT (bpm_key, input, system_type)
      DO UPDATE SET
        output = EXCLUDED.output,
        remark = EXCLUDED.remark
    `;

    // Invalidate cache
    const cacheKey = `${configKey}:${input}:${systemType}`;
    configCache.delete(cacheKey);

    return true;
  } catch (error) {
    console.error('Config set error:', error);
    return false;
  }
}

/**
 * Delete configuration value
 */
async function deleteConfigValue(configKey, input, systemType = 'NL') {
  try {
    await sql`
      DELETE FROM bpm_soap_bocaller_parameters
      WHERE bpm_key = ${configKey} AND input = ${input} AND system_type = ${systemType}
    `;

    // Invalidate cache
    const cacheKey = `${configKey}:${input}:${systemType}`;
    configCache.delete(cacheKey);

    return true;
  } catch (error) {
    console.error('Config delete error:', error);
    return false;
  }
}

/**
 * Clear cache (useful for testing or forced refresh)
 */
function clearCache(configKey = null) {
  if (configKey) {
    // Clear specific key
    for (const key of configCache.keys()) {
      if (key.startsWith(configKey + ':')) {
        configCache.delete(key);
      }
    }
  } else {
    // Clear all
    configCache.clear();
  }
}

/**
 * Batch import configuration values
 * @param {String} configKey - Configuration key
 * @param {Array} mappings - Array of {input, output, description}
 * @param {String} systemType - System type
 */
async function batchImportConfig(configKey, mappings, systemType = 'NL') {
  try {
    // Note: @vercel/postgres doesn't support transactions the same way
    // We'll do sequential inserts instead
    for (const mapping of mappings) {
      await sql`
        INSERT INTO bpm_soap_bocaller_parameters
        (bpm_key, input, output, system_type, remark)
        VALUES (${configKey}, ${mapping.input}, ${mapping.output}, ${systemType}, ${mapping.description || null})
        ON CONFLICT (bpm_key, input, system_type)
        DO UPDATE SET
          output = EXCLUDED.output,
          remark = EXCLUDED.remark
      `;
    }

    // Clear cache for this key
    clearCache(configKey);

    return true;
  } catch (error) {
    console.error('Batch import error:', error);
    return false;
  }
}

/**
 * Get all configuration keys
 */
async function getAllConfigKeys() {
  try {
    const result = await sql`
      SELECT DISTINCT bpm_key, COUNT(*) as count
      FROM bpm_soap_bocaller_parameters
      GROUP BY bpm_key
      ORDER BY bpm_key
    `;

    return result.rows;
  } catch (error) {
    console.error('Get config keys error:', error);
    return [];
  }
}

// ============================================================================
// NOTE: ไม่มี PRE-DEFINED CONFIG HELPERS อีกต่อไป
// ใช้ getConfigValue() โดยตรงในทุกที่
// หรือใช้ CONFIG function type ใน mapping engine
// ============================================================================

// ============================================================================
// EXPORTS
// ============================================================================

export {
  // Core functions - ใช้แค่นี้พอ
  getConfigValue,
  getAllConfigValues,
  setConfigValue,
  deleteConfigValue,
  clearCache,
  batchImportConfig,
  getAllConfigKeys
};
