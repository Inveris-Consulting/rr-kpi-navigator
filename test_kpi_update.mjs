import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Fetching KPIs...");
  const { data: kpis, error: fetchError } = await supabase.from('kpis').select('*').limit(1);
  if (fetchError) {
    console.error("Fetch error:", fetchError);
    return;
  }
  
  if (!kpis || kpis.length === 0) {
    console.log("No KPIs found to test.");
    return;
  }
  
  const kpi = kpis[0];
  console.log("Trying to update KPI:", kpi.id);
  
  const { data, error } = await supabase.from('kpis').update({ name: kpi.name + ' test' }).eq('id', kpi.id).select();
  
  console.log("Update result data:", data);
  console.log("Update result error:", error);
  
  // Revert
  if (data && data.length > 0) {
    await supabase.from('kpis').update({ name: kpi.name }).eq('id', kpi.id);
    console.log("Reverted");
  }
}

check();
