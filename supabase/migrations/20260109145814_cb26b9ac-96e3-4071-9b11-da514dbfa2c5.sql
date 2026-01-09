-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  target_role user_role,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  quotation_id UUID REFERENCES public.quotations(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view notifications meant for them (by user_id or by role)
CREATE POLICY "Users can view their notifications"
ON public.notifications
FOR SELECT
USING (
  auth.uid() = user_id 
  OR (target_role IS NOT NULL AND has_user_role(auth.uid(), target_role))
);

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update their notifications"
ON public.notifications
FOR UPDATE
USING (
  auth.uid() = user_id 
  OR (target_role IS NOT NULL AND has_user_role(auth.uid(), target_role))
);

-- System can insert notifications (via service role or authenticated users)
CREATE POLICY "Authenticated users can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Create index for faster queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_target_role ON public.notifications(target_role);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;