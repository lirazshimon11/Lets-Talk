const { createClient } = require('@supabase/supabase-js');

// These keys are taken from your .env.local — they are public keys
// anyone visiting your site can see in the browser.
const supabaseUrl = 'https://rutalnhhglcsqmhurqhq.supabase.co';
const supabaseAnonKey = 'sb_publishable_xa9WBP5UuNK7rfh69w1isA_vj3S9HtE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function scrapeUsers() {
    console.log("🚀 Starting scraping simulation...");

    // Attempt to select sensitive info from ALL users
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select(`
            id, 
            my_name, 
            my_age, 
            my_gender, 
            my_hair, 
            my_eyes, 
            my_ethnicity, 
            my_religion, 
            match_gender, 
            match_age_min, 
            match_age_max
        `);

    if (error) {
        console.error("❌ Scraping failed:", error.message);
        return;
    }

    if (profiles && profiles.length > 0) {
        console.log(`✅ SUCCESS! Scraped ${profiles.length} user profiles.`);
        console.log("\n--- Sample Scraped Data (First 2 Users) ---");
        console.table(profiles.slice(0, 2));
        console.log("\n⚠️  Note: This was done with zero authentication.");
    } else {
        console.log("ℹ️  No profiles found (the database might be empty).");
    }
}

scrapeUsers();


