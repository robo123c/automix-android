import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import "@/global.css";
import { MixProvider } from "@/lib/mix-context";
import { ThemeProvider } from "@/lib/theme-provider";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <MixProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
      </MixProvider>
    </ThemeProvider>
  );
}
