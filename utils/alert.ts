import { Alert, Platform } from "react-native";

type AlertButton = {
  text?: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
};

/**
 * Drop-in replacement for RN's Alert.alert that also works on web.
 * react-native-web's Alert.alert() is a no-op, so confirm/destructive
 * dialogs silently never appear there — this uses window.confirm/alert instead.
 */
export function showAlert(title: string, message?: string, buttons?: AlertButton[]): void {
  if (Platform.OS !== "web") {
    Alert.alert(title, message, buttons);
    return;
  }
  const list = buttons && buttons.length > 0 ? buttons : [{ text: "OK" }];
  const text = [title, message].filter(Boolean).join("\n\n");
  if (list.length === 1) {
    window.alert(text);
    list[0].onPress?.();
    return;
  }
  const confirmBtn = list.find((b) => b.style !== "cancel") ?? list[list.length - 1];
  const cancelBtn = list.find((b) => b.style === "cancel");
  if (window.confirm(text)) {
    confirmBtn.onPress?.();
  } else {
    cancelBtn?.onPress?.();
  }
}
