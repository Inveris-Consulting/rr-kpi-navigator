import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: users } = await supabase.from('users').select('*').limit(3);
    const { data: userKpis, error: errKpis } = await supabase.from('user_kpis').select('*').limit(5);
    const { data: kpis } = await supabase.from('kpis').select('*').limit(3);

    console.log('--- USERS ---');
    console.log(users);
    console.log('--- USER_KPIS ---');
    console.log(userKpis);
    if (errKpis) console.error(errKpis);
    console.log('--- KPIS ---');
    console.log(kpis);
}
check();
