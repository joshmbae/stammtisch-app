import { View, ActivityIndicator } from "react-native";
import { useColors } from "../contexts/ThemeContext";

export default function LoadingSpinner() {
  const c = useColors();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator color={c.blue} size="large" />
    </View>
  );
}
