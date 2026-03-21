import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: convs, error: errC } = await supabase.from('conversations').select('*');
  if (errC) {
    console.error('Error fetching convs:', errC);
    return;
  }
  
  if(convs && convs.length > 0) {
    console.log(`Found ${convs.length} conversations.`);
    for (const c of convs) {
      if (c.status === 'revealed') {
        console.log(`Conv ${c.id} is already revealed.`);
        continue;
      }
      const { data: msgs } = await supabase.from('messages').select('sender_id, reactions').eq('conversation_id', c.id);
      
      const myCount = msgs.filter(m => m.sender_id === c.user1_id).length;
      const theirCount = msgs.filter(m => m.sender_id === c.user2_id).length;
      
      const user1Reacted = msgs
          .filter(m => m.sender_id === c.user2_id && m.reactions)
          .some(m => Object.values(m.reactions).some(uids => uids.includes(c.user1_id)));
          
      const user2Reacted = msgs
          .filter(m => m.sender_id === c.user1_id && m.reactions)
          .some(m => Object.values(m.reactions).some(uids => uids.includes(c.user2_id)));
          
      console.log(`Conv ${c.id} status=${c.status}:`);
      console.log(`  user1 msg count: ${myCount} (>=15: ${myCount >= 15})`);
      console.log(`  user2 msg count: ${theirCount} (>=15: ${theirCount >= 15})`);
      console.log(`  user1 reacted to user2: ${user1Reacted}`);
      console.log(`  user2 reacted to user1: ${user2Reacted}`);
      
      if (myCount >= 15 && theirCount >= 15 && user1Reacted && user2Reacted) {
          console.log(`  -> CONDITIONS MET! It should have updated!`);
      } else {
          console.log(`  -> Conditions NOT met.`);
      }
    }
  }
}
run().catch(console.error);
