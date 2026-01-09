import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Notification {
  id: string;
  user_id: string | null;
  target_role: string | null;
  type: string;
  title: string;
  message: string;
  quotation_id: string | null;
  is_read: boolean;
  created_at: string;
}

export function useNotifications() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications", user?.id, profile?.role],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user,
  });

  // Subscribe to realtime notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("notifications-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        () => {
          // Refetch notifications when new ones arrive
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!notifications) return;
      
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      if (unreadIds.length === 0) return;
      
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .in("id", unreadIds);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  return {
    notifications: notifications || [],
    isLoading,
    unreadCount,
    markAsRead,
    markAllAsRead,
  };
}

export async function createNotification({
  userId,
  targetRole,
  type,
  title,
  message,
  quotationId,
}: {
  userId?: string;
  targetRole?: "admin" | "sales" | "tenaga_ahli" | "tenaga_pialang";
  type: string;
  title: string;
  message: string;
  quotationId?: string;
}) {
  const insertData: {
    type: string;
    title: string;
    message: string;
    user_id?: string;
    target_role?: "admin" | "sales" | "tenaga_ahli" | "tenaga_pialang";
    quotation_id?: string;
  } = {
    type,
    title,
    message,
  };

  if (userId) insertData.user_id = userId;
  if (targetRole) insertData.target_role = targetRole;
  if (quotationId) insertData.quotation_id = quotationId;

  const { error } = await supabase
    .from("notifications")
    .insert(insertData);
  
  if (error) throw error;
}
