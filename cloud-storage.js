/**
 * Cloud Storage Module for Pillars
 * Uses JSONBin.io as a free cloud storage backend for bidirectional sync
 * 
 * Setup:
 * 1. Create a free account at https://jsonbin.io
 * 2. Get your API key from the dashboard
 * 3. Set JSONBIN_API_KEY environment variable (or in .env file)
 * 4. Optionally set JSONBIN_BIN_ID if you have an existing bin
 */

import fetch from 'node-fetch';

// JSONBin.io configuration
const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY || null;
const JSONBIN_BIN_ID = process.env.JSONBIN_BIN_ID || null;
const JSONBIN_BASE_URL = 'https://api.jsonbin.io/v3';

// In-memory cache with timestamps
let cache = {};
let cacheTimestamp = {};
const CACHE_TTL = 5000; // 5 seconds cache

/**
 * Initialize or get the bin ID
 * If no bin exists, creates one
 */
async function ensureBin() {
  if (JSONBIN_BIN_ID) {
    return JSONBIN_BIN_ID;
  }
  
  // Try to read bin ID from environment or create new
  console.log('[CloudStorage] No JSONBIN_BIN_ID set. Creating new bin...');
  
  const response = await fetch(`${JSONBIN_BASE_URL}/b`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': JSONBIN_API_KEY,
      'X-Bin-Name': 'pillars-data'
    },
    body: JSON.stringify({ initialized: true, createdAt: new Date().toISOString() })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create bin: ${response.status}`);
  }
  
  const data = await response.json();
  console.log(`[CloudStorage] Created new bin: ${data.metadata.id}`);
  console.log(`[CloudStorage] Set JSONBIN_BIN_ID=${data.metadata.id} in your environment`);
  
  return data.metadata.id;
}

/**
 * Get data from cloud storage
 */
export async function cloudGet(key) {
  if (!JSONBIN_API_KEY) {
    console.warn('[CloudStorage] JSONBIN_API_KEY not set, cloud sync disabled');
    return null;
  }
  
  // Check cache
  const now = Date.now();
  if (cache[key] && cacheTimestamp[key] && (now - cacheTimestamp[key] < CACHE_TTL)) {
    return cache[key];
  }
  
  try {
    const binId = await ensureBin();
    
    const response = await fetch(`${JSONBIN_BASE_URL}/b/${binId}/latest`, {
      method: 'GET',
      headers: {
        'X-Master-Key': JSONBIN_API_KEY
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to get data: ${response.status}`);
    }
    
    const data = await response.json();
    const record = data.record || {};
    
    // Update cache
    cache = record;
    cacheTimestamp[key] = now;
    
    return record[key] || null;
  } catch (error) {
    console.error('[CloudStorage] Get error:', error.message);
    return null;
  }
}

/**
 * Save data to cloud storage
 */
export async function cloudSet(key, value) {
  if (!JSONBIN_API_KEY) {
    console.warn('[CloudStorage] JSONBIN_API_KEY not set, cloud sync disabled');
    return false;
  }
  
  try {
    const binId = await ensureBin();
    
    // First get current data
    let currentData = {};
    try {
      const getResponse = await fetch(`${JSONBIN_BASE_URL}/b/${binId}/latest`, {
        method: 'GET',
        headers: {
          'X-Master-Key': JSONBIN_API_KEY
        }
      });
      if (getResponse.ok) {
        const getData = await getResponse.json();
        currentData = getData.record || {};
      }
    } catch (e) {
      // Ignore errors, start fresh
    }
    
    // Merge with new data
    currentData[key] = value;
    currentData._lastModified = new Date().toISOString();
    currentData._lastModifiedKey = key;
    
    // Update bin
    const response = await fetch(`${JSONBIN_BASE_URL}/b/${binId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': JSONBIN_API_KEY
      },
      body: JSON.stringify(currentData)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to save data: ${response.status}`);
    }
    
    // Update cache
    cache = currentData;
    cacheTimestamp[key] = Date.now();
    
    console.log(`[CloudStorage] Saved ${key} to cloud`);
    return true;
  } catch (error) {
    console.error('[CloudStorage] Set error:', error.message);
    return false;
  }
}

/**
 * Get all data from cloud
 */
export async function cloudGetAll() {
  if (!JSONBIN_API_KEY) {
    return {};
  }
  
  try {
    const binId = await ensureBin();
    
    const response = await fetch(`${JSONBIN_BASE_URL}/b/${binId}/latest`, {
      method: 'GET',
      headers: {
        'X-Master-Key': JSONBIN_API_KEY
      }
    });
    
    if (!response.ok) {
      return {};
    }
    
    const data = await response.json();
    return data.record || {};
  } catch (error) {
    console.error('[CloudStorage] GetAll error:', error.message);
    return {};
  }
}

/**
 * Check if cloud storage is configured
 */
export function isCloudEnabled() {
  return !!JSONBIN_API_KEY;
}

/**
 * Get last modification info
 */
export async function getLastModified() {
  const data = await cloudGetAll();
  return {
    timestamp: data._lastModified || null,
    key: data._lastModifiedKey || null
  };
}

export default {
  get: cloudGet,
  set: cloudSet,
  getAll: cloudGetAll,
  isEnabled: isCloudEnabled,
  getLastModified
};
