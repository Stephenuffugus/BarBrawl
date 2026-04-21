import { Text, View } from "react-native";
import { theme } from "@/theme";

export default function Home() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.bg,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <Text
        style={{
          color: theme.accent,
          fontSize: 32,
          fontWeight: "900",
          letterSpacing: 1,
        }}
      >
        BARBRAWL
      </Text>
      <Text style={{ color: theme.dim, marginTop: 8 }}>
        Phase 0 — scaffold booted.
      </Text>
    </View>
  );
}
