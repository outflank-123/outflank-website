import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envFile = fs.readFileSync('.env', 'utf8')
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) {
    let val = match[2].trim()
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.substring(1, val.length - 1)
    }
    process.env[match[1].trim()] = val
  }
})

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function run() {
  const { error } = await supabase.rpc('execute_sql', { 
    sql_query: "ALTER TABLE public.retail_orders ADD COLUMN IF NOT EXISTS customer_uid text;"
  })
  
  if (error) {
    console.log("RPC failed, trying raw SQL via postgres connection string if possible, or we will just use supabase sql dashboard.")
    console.log("Error:", error)
  } else {
    console.log("Successfully added customer_uid column.")
  }
}

run()
