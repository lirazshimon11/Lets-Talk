const SUPABASE_URL = "https://rutalnhhglcsqmhurqhq.supabase.co/rest/v1/";
const API_KEY = "sb_publishable_xa9WBP5UuNK7rfh69w1isA_vj3S9HtE";
const AUTH_TOKEN = "Bearer eyJhbGciOiJFUzI1NiIsImtpZCI6IjFiOWU0NDg3LTZkMTItNGQ0Yy1iYzAxLTE1ODIzODU0YzExMSIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3J1dGFsbmhoZ2xjc3FtaHVycWhxLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI3YjA2MmYyOC02NDhlLTQ5YmItOTY0NS1kNjdiNDA3MTI0NzYiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzczNTE5NjY0LCJpYXQiOjE3NzM1MTYwNjQsImVtYWlsIjoid29tYW5AZ21haWwuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJlbWFpbF92ZXJpZmllZCI6dHJ1ZX0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3NzM1MTYwNjR9XSwic2Vzc2lvbl9pZCI6IjExNGVhZGE0LTA5YzktNGU2My1iOTJlLWI1NzQ2MWFhY2ZkNSIsImlzX2Fub255bW91cyI6ZmFsc2V9.ZQ6VmrcLeRwXjuSsJLTiawVG_S20VCGK9KndJL7PKtcujBG84mU8b5oM3NMexVYbSoSd2y_xV3KudJot2QcoDQ";

async function findRpcs() {
  try {
    // There is no direct REST endpoint for pg_proc, but we can try to call a known RPC to see if it exists
    // Wait, is there any RPC we can find by checking the Swagger definitions?
    const response = await fetch("https://rutalnhhglcsqmhurqhq.supabase.co/rest/v1/?apikey=" + API_KEY);
    const text = await response.text();
    console.log(text.substring(0, 500)); // The openapi spec!
    const json = JSON.parse(text);
    
    // Paths are like "/rpc/function_name"
    const rpcs = Object.keys(json.paths).filter(p => p.startsWith("/rpc/"));
    console.log("RPCs found:");
    rpcs.forEach(r => console.log(r));

  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

findRpcs();
