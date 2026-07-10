import { StyleSheet, Image } from "react-native";

interface Props {
  size?: number;
}

export default function StammtischLogo({ size = 58 }: Props) {
  return (
    <Image
      source={require("../assets/logo.png")}
      resizeMode="contain"
      style={[styles.image, { width: size, height: size }]}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
});
