-- Run this entire script in your Supabase SQL Editor to fix the emoji reaction bug

-- Enable RLS just in case it isn't enabled
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Drop the old overly-restrictive policy if you had one uniquely for messages updates (Optional, but safe)
-- DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;

-- Create a new policy that allows you to update ANY message (i.e. to add reactions) 
-- as long as you are one of the two participants in that conversation.
CREATE POLICY "Users can update conversation messages" 
ON public.messages 
FOR UPDATE 
USING (
  conversation_id IN (
    SELECT id FROM public.conversations
    WHERE user1_id = auth.uid() OR user2_id = auth.uid()
  )
);
