import React from "react";
import { Platform, TouchableOpacity, Text, StyleSheet } from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { ThemeColors, FONT } from "../constants/design";
import { useTheme, useThemedStyles } from "../contexts/ThemeContext";

type Props = {
  value: Date;
  mode: "date" | "time";
  onChange: (date: Date) => void;
  onClose: () => void;
  minimumDate?: Date;
  maximumDate?: Date;
  is24Hour?: boolean;
};

// Auf iOS feuert der Spinner bei jedem Wheel-Tick ein onChange-Event, schließt
// sich aber nie selbst — deshalb hier erst schließen, wenn der Nutzer auf
// "Fertig" tippt. Android schließt den nativen Dialog selbst und meldet das
// über den Event-Typ, dem wir hier folgen.
export default function InlineDateTimePicker({
  value,
  mode,
  onChange,
  onClose,
  minimumDate,
  maximumDate,
  is24Hour,
}: Props) {
  const { scheme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") {
      onClose();
    }
    if (date) onChange(date);
  };

  return (
    <>
      <DateTimePicker
        value={value}
        mode={mode}
        display={Platform.OS === "ios" ? "spinner" : "default"}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        is24Hour={is24Hour}
        onChange={handleChange}
        themeVariant={scheme}
      />
      {Platform.OS === "ios" && (
        <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
          <Text style={styles.doneBtnText}>Fertig</Text>
        </TouchableOpacity>
      )}
    </>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  doneBtn: {
    alignSelf: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  doneBtnText: {
    color: c.blue,
    fontSize: 16,
    fontFamily: FONT.w600,
  },
});
