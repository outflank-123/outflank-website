/**
 * create-admin.mjs
 * ─────────────────
 * Creates an admin user directly via Supabase Admin API
 * (bypasses auth UI and any broken triggers).
 *
 * Usage:
 *   node scripts/create-admin.mjs [email] [password] [fullName] [role]
 *
 * Or set environment variables:
 *   INITIAL_ADMIN_EMAIL=...
 *   INITIAL_ADMIN_PASSWORD=...
 *   INITIAL_ADMIN_NAME=...
 *   INITIAL_ADMIN_ROLE=super_admin
 */

import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

// ── Load .env ────────────────────────────────────────────────────────────────
const __dir = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dir, '../.env')
const env = {}

if (existsSync(envPath)) {
  const envLines = readFileSync(envPath, 'utf8').split('\n')
  for (const line of envLines) {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) env[match[1].trim()] = match[2].trim()
  }
}

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL || env['NEXT_PUBLIC_SUPABASE_URL']
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || env['SUPABASE_SERVICE_ROLE_KEY']

// ── Admin credentials to create ──────────────────────────────────────────────
const args = process.argv.slice(2)
const ADMIN_EMAIL    = args[0] || process.env.INITIAL_ADMIN_EMAIL || env['INITIAL_ADMIN_EMAIL']
const ADMIN_PASSWORD = args[1] || process.env.INITIAL_ADMIN_PASSWORD || env['INITIAL_ADMIN_PASSWORD']
const ADMIN_NAME     = args[2] || process.env.INITIAL_ADMIN_NAME || env['INITIAL_ADMIN_NAME'] || 'Super Admin'
const ADMIN_ROLE     = args[3] || process.env.INITIAL_ADMIN_ROLE || env['INITIAL_ADMIN_ROLE'] || 'super_admin'

// ─────────────────────────────────────────────────────────────────────────────

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('❌ Missing admin email or password.')
  console.error('Usage: node scripts/create-admin.mjs <email> <password> [fullName] [role]')
  console.error('Or set INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD in .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function main() {
  console.log('\n👤 Creating admin user via Supabase Admin API...')
  console.log(`   Email: ${ADMIN_EMAIL}`)
  console.log(`   Role:  ${ADMIN_ROLE}\n`)

  // Step 1: Check if user already exists — delete old one if so
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const existing = existingUsers?.users?.find(u => u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase())

  if (existing) {
    console.log(' ⚠️ User already exists — deleting and recreating...')
    await supabase.auth.admin.deleteUser(existing.id)
  }

  // Step 2: Create fresh user
  const { data, error } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true, // skip email verification
    user_metadata: { full_name: ADMIN_NAME },
  })

  if (error) {
    console.error(`\n❌ Failed to create user: ${error.message}`)
    console.error('   Make sure you have run schema.sql in Supabase first.\n')
    process.exit(1)
  }

  const userId = data.user.id
  console.log(` ✓ Auth user created — ID: ${userId}`)

  // Step 3: Insert into admin_profiles table
  const { error: profileErr } = await supabase
    .from('admin_profiles')
    .upsert({
      id: userId,
      full_name: ADMIN_NAME,
      role: ADMIN_ROLE,
    })

  if (profileErr) {
    console.warn(`\n ⚠️ User created in auth but admin_profiles insert failed:`)
    console.warn(`    ${profileErr.message}`)
    console.warn(`    → Run schema.sql first, then re-run this script.\n`)
  } else {
    console.log(' ✓ admin_profiles row created')
  }

  console.log('\n✅ Admin user ready!')
  console.log(`   Email: ${ADMIN_EMAIL}`)
  console.log('\n   Login at: /admin/login\n')
}

main().catch(err => {
  console.error('Fatal:', err.message)
  process.exit(1)
})
