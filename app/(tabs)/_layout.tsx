import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 10 : Math.max(insets.bottom, 10);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#C7FF3D",
        tabBarInactiveTintColor: "#747783",
        tabBarStyle: {
          backgroundColor: "#101219",
          borderTopColor: "#272A34",
          height: 61 + bottomPadding,
          paddingTop: 7,
          paddingBottom: bottomPadding,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "700" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Player", tabBarIcon: ({ color }) => <MaterialIcons name="graphic-eq" size={24} color={color} /> }}
      />
      <Tabs.Screen
        name="queue"
        options={{ title: "Queue", tabBarIcon: ({ color }) => <MaterialIcons name="queue-music" size={24} color={color} /> }}
      />
      <Tabs.Screen
        name="library"
        options={{ title: "Library", tabBarIcon: ({ color }) => <MaterialIcons name="library-music" size={24} color={color} /> }}
      />
    </Tabs>
  );
}
