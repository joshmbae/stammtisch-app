import { View, ActivityIndicator } from "react-native";
import { COLORS } from "../constants/design";

export default function LoadingSpinner() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator color={COLORS.blue} size="large" />
    </View>
  );
}
