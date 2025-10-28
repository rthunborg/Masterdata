import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing environment variables");
  console.log("   NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "✓" : "✗");
  console.log("   SUPABASE_SERVICE_ROLE_KEY:", supabaseKey ? "✓" : "✗");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkImportantDatesTable() {
  try {
    console.log("Checking if important_dates table exists...");
    
    // Try to query the table
    const { data, error } = await supabase
      .from("important_dates")
      .select("id")
      .limit(1);
    
    if (error) {
      console.error("❌ Error accessing important_dates table:", error.message);
      console.log("\n📝 The table may not exist yet. Please run the migration:");
      console.log("   SQL file: supabase/migrations/20251028000001_create_important_dates.sql");
      return false;
    }
    
    console.log("✅ important_dates table exists!");
    console.log(`   Found ${data?.length || 0} records`);
    return true;
  } catch (err) {
    console.error("❌ Unexpected error:", err);
    return false;
  }
}

checkImportantDatesTable().then((exists) => {
  process.exit(exists ? 0 : 1);
});
