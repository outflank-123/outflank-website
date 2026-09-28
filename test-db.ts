import { createAdminClient } from './lib/supabase/admin';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('retail_orders')
    .select('id, created_at, whatsapp_notified_placed, total_amount')
    .order('created_at', { ascending: false })
    .limit(5);
  console.log("Data:", data);
  console.log("Error:", error);
}
run();
