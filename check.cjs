const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: users, error: err1 } = await supabase.from('users').select('*').limit(3);
    const { data: userKpis, error: err2 } = await supabase.from('user_kpis').select('*').limit(5);
    const { data: kpis, error: err3 } = await supabase.from('kpis').select('*').limit(3);

    if (err1) console.error("USERS ERROR:", err1);
    if (err2) console.error("USER_KPIS ERROR:", err2);
    if (err3) console.error("KPIS ERROR:", err3);

    console.log('--- USERS ---');
    console.log(users);
    console.log('--- USER_KPIS ---');
    console.log(userKpis);
    console.log('--- KPIS ---');
    console.log(kpis);
}
check();
