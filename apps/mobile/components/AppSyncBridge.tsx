import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSocket } from "@ronbri/api-client";
import { useAuth } from "../contexts/AuthContext";
import { mobileNotification } from "./toast";

export function AppSyncBridge() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (!user) return;
    const socket = getSocket();

    const refreshMessages = () => queryClient.invalidateQueries({ queryKey: ["messages"] });
    const refreshCalendar = () => queryClient.invalidateQueries({ queryKey: ["calendar"] });
    const refreshInvites = () => {
      queryClient.invalidateQueries({ queryKey: ["invites", "inbox"] });
      queryClient.invalidateQueries({ queryKey: ["invites", "sent"] });
    };
    const refreshRelationship = () => queryClient.invalidateQueries({ queryKey: ["relationship"] });
    const showHeartbeat = () => mobileNotification.info("Your partner sent you a heartbeat.");
    const refreshAll = () => {
      refreshMessages();
      refreshCalendar();
      refreshInvites();
      refreshRelationship();
    };

    socket.on("connect", refreshAll);
    socket.on("message:new", refreshMessages);
    socket.on("calendar:created", refreshCalendar);
    socket.on("calendar:updated", refreshCalendar);
    socket.on("calendar:deleted", refreshCalendar);
    socket.on("invite:new", refreshInvites);
    socket.on("invite:responded", refreshInvites);
    socket.on("relationship:updated", refreshRelationship);
    socket.on("heart:received", showHeartbeat);

    return () => {
      socket.off("connect", refreshAll);
      socket.off("message:new", refreshMessages);
      socket.off("calendar:created", refreshCalendar);
      socket.off("calendar:updated", refreshCalendar);
      socket.off("calendar:deleted", refreshCalendar);
      socket.off("invite:new", refreshInvites);
      socket.off("invite:responded", refreshInvites);
      socket.off("relationship:updated", refreshRelationship);
      socket.off("heart:received", showHeartbeat);
    };
  }, [queryClient, user?.id]);

  return null;
}
