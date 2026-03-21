import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://rutalnhhglcsqmhurqhq.supabase.co";
const API_KEY = "sb_publishable_xa9WBP5UuNK7rfh69w1isA_vj3S9HtE";
// It is the anon key! So we need a JWT to act as a user.
// Since we don't know the user JWT easily unless we grab it, we can just use the ANON key but we won't bypass RLS.
// Wait, the message_sending.js has the AUTH_TOKEN!
const SUPABASE_URL_RPC = "https://rutalnhhglcsqmhurqhq.supabase.co/rest/v1/";
const AUTH_TOKEN = "Bearer eyJhbGciOiJFUzI1NiIsImtpZCI6IjFiOWU0NDg3LTZkMTItNGQ0Yy1iYzAxLTE1ODIzODU0YzExMSIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3J1dGFsbmhoZ2xjc3FtaHVycWhxLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI3YjA2MmYyOC02NDhlLTQ5YmItOTY0NS1kNjdiNDA3MTI0NzYiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzczNTE5NjY0LCJpYXQiOjE3NzM1MTYwNjQsImVtYWlsIjoid29tYW5AZ21haWwuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJlbWFpbF92ZXJpZmllZCI6dHJ1ZX0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3NzM1MTYwNjR9XSwic2Vzc2lvbl9pZCI6IjExNGVhZGE0LTA5YzktNGU2My1iOTJlLWI1NzQ2MWFhY2ZkNSIsImlzX2Fub255bW91cyI6ZmFsc2V9.ZQ6VmrcLeRwXjuSsJLTiawVG_S20VCGK9KndJL7PKtcujBG84mU8b5oM3NMexVYbSoSd2y_xV3KudJot2QcoDQ";
// We don't really need to do the update, we just need to fix `Chat.jsx`

// But what if the RLS on messages DOES NO update on other people's messages?
// Then we cannot fix it from `Chat.jsx` directly using `.update()`.
// Unless there is a typo in Chat.jsx!
