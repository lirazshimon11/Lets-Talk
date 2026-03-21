import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const env = Object.fromEntries(envFile.split('\n').filter(Boolean).map(l => {
  const i = l.indexOf('=');
  return [l.slice(0,i), l.slice(i+1)];
}));

const baseUrl = env.VITE_SUPABASE_URL + '/rest/v1';
const headers = {
  apikey: env.VITE_SUPABASE_ANON_KEY.trim(),
  Authorization: 'Bearer ' + env.VITE_SUPABASE_ANON_KEY.trim()
};

async function test() {
  const req = await fetch(baseUrl + '/conversations?status=eq.active&select=id,user1_id,user2_id', { headers });
  const convs = await req.json();
  if(!convs.length) return console.log('No active conversations found.');
  
  for(const c of convs) {
    const req2 = await fetch(baseUrl + '/messages?conversation_id=eq.' + c.id + '&select=sender_id,reactions', { headers });
    const msgs = await req2.json();
    
    const myCount = msgs.filter(m => m.sender_id === c.user1_id).length;
    const theirCount = msgs.filter(m => m.sender_id === c.user2_id).length;
    
    const iHaveReacted = msgs
          .filter(m => m.sender_id === c.user2_id && m.reactions)
          .some(m => Object.values(m.reactions).some(uids => uids.includes(c.user1_id)));
          
    const theyHaveReacted = msgs
        .filter(m => m.sender_id === c.user1_id && m.reactions)
        .some(m => Object.values(m.reactions).some(uids => uids.includes(c.user2_id)));
        
    console.log('Conv', c.id);
    console.log(' - User1 msgs:', myCount, myCount >= 15 ? 'OK' : 'FAIL');
    console.log(' - User2 msgs:', theirCount, theirCount >= 15 ? 'OK' : 'FAIL');
    console.log(' - User1 reacted to User2? ', iHaveReacted ? 'OK' : 'FAIL');
    console.log(' - User2 reacted to User1? ', theyHaveReacted ? 'OK' : 'FAIL');
    if (myCount >= 15 && theirCount >= 15 && iHaveReacted && theyHaveReacted) console.log(' -> SHOUlD BE REVEALED!');
  }
}
test().catch(console.error);
