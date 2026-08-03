import { StyleSheet, Image, View } from "react-native";

interface Props {
  size?: number;
  uri?: string;
}

export default function StammtischLogo({ size = 58, uri }: Props) {
  return (
    <View style={[styles.shadowWrap, { width: size, height: size }]}>
      <Image
        source={uri ? { uri } : require("../assets/logo.png")}
        resizeMode="contain"
        style={{ width: size, height: size, borderRadius: size * 0.22 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
});
