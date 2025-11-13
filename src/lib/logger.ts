import { supabase } from "@/integrations/supabase/client";

export const logAction = async (
  action: string,
  entityType: string,
  entityId?: string,
  details?: any
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    await supabase.from("action_logs").insert({
      user_id: user.id,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
    });
  } catch (error) {
    console.error("Error logging action:", error);
  }
};
