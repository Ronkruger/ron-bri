import React from "react";
import { Tabs } from "expo-router";
import { Icon, type IconName } from "../../components/ui";

const tabs: Record<string, IconName> = {
  index: "home-variant-outline",
  chat: "message-outline",
  calendar: "calendar-month-outline",
  invites: "email-outline",
  ai: "auto-fix",
  profile: "account-outline",
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "rgba(255, 253, 249, .96)",
          borderTopColor: "rgba(185, 130, 103, .18)",
          borderTopWidth: 1,
          elevation: 0,
          height: 68,
          paddingBottom: 9,
          paddingTop: 7,
        },
        tabBarActiveTintColor: "#9d654d",
        tabBarInactiveTintColor: "#b8a39b",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
        tabBarIcon: ({ focused, color }) => <Icon name={tabs[route.name]} size={focused ? 23 : 21} color={color} />,
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="chat" options={{ title: "Chat" }} />
      <Tabs.Screen name="calendar" options={{ title: "Calendar" }} />
      <Tabs.Screen name="invites" options={{ title: "Invites" }} />
      <Tabs.Screen name="ai" options={{ title: "AI" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
