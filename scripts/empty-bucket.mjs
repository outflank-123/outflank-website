/**
 * empty-bucket.mjs
 * ─────────────────
 * Empties the Supabase 'product-images' storage bucket via the API
 * (Supabase does not allow direct SQL deletion from storage tables).
 *
 * Usage:
 *   node scripts/empty-bucket.mjs
 *
 * Requires Node 18+ (built-in fetch).
 * Reads credentials from the .env file in the project root.
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

// ── Load .env manually (no dotenv dependency needed) ─────────────────────────
const __dir = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dir, '../.env')
const envLines = readFileSync(envPath, 'utf8').split('\n')
const env = {}
for (const line of envLines) {
  const match = line.match(/^([^#=]+)=(.*)$/)
  if (match) env[match[1].trim()] = match[2].trim()
}

const SUPABASE_URL      = env['NEXT_PUBLIC_SUPABASE_URL']
const SERVICE_ROLE_KEY  = env['SUPABASE_SERVICE_ROLE_KEY']
const BUCKET            = 'product-images'

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})

// ── Recursively list all files in the bucket ──────────────────────────────────
async function listAllFiles(prefix = '') {
  const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
    limit: 1000,
    offset: 0,
  })
  if (error) throw new Error(`List error: ${error.message}`)
  if (!data || data.length === 0) return []

  const files = []
  for (const item of data) {
    if (item.id === null) {
      // It's a folder — recurse
      const subPath = prefix ? `${prefix}/${item.name}` : item.name
      const subFiles = await listAllFiles(subPath)
      files.push(...subFiles)
    } else {
      // It's a file
      files.push(prefix ? `${prefix}/${item.name}` : item.name)
    }
  }
  return files
}

// ── Delete in batches of 100 ──────────────────────────────────────────────────
async function deleteFiles(paths) {
  const BATCH = 100
  let deleted = 0
  for (let i = 0; i < paths.length; i += BATCH) {
    const batch = paths.slice(i, i + BATCH)
    const { error } = await supabase.storage.from(BUCKET).remove(batch)
    if (error) {
      console.error(`  ✗ Failed to delete batch: ${error.message}`)
    } else {
      deleted += batch.length
      console.log(`  ✓ Deleted ${deleted} / ${paths.length} files`)
    }
  }
  return deleted
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🗑️  Emptying Supabase bucket: "${BUCKET}"`)
  console.log(`   URL: ${SUPABASE_URL}\n`)

  // Check bucket exists
  const { data: buckets } = await supabase.storage.listBuckets()
  const exists = buckets?.some(b => b.name === BUCKET)
  if (!exists) {
    console.log(`ℹ️  Bucket "${BUCKET}" does not exist yet — nothing to empty.`)
    console.log('   It will be created fresh when you run schema.sql\n')
    process.exit(0)
  }

  // List all files
  console.log('  Listing all files...')
  const allFiles = await listAllFiles()

  if (allFiles.length === 0) {
    console.log('  ✓ Bucket is already empty.\n')
  } else {
    console.log(`  Found ${allFiles.length} file(s) to delete.\n`)
    await deleteFiles(allFiles)
  }

  // Delete the bucket itself
  console.log('\n  Deleting bucket...')
  const { error: bucketErr } = await supabase.storage.deleteBucket(BUCKET)
  if (bucketErr) {
    // Non-fatal — bucket will be recreated by schema.sql anyway
    console.log(`  ⚠  Could not delete bucket: ${bucketErr.message}`)
    console.log('     (This is fine — schema.sql will recreate it)')
  } else {
    console.log(`  ✓ Bucket "${BUCKET}" deleted.`)
  }

  console.log('\n✅  Done! Now run schema.sql in the Supabase SQL Editor.\n')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
