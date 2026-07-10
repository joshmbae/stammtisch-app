import { StyleSheet, Image } from "react-native";

interface Props {
  size?: number;
}

export default function StammtischLogo({ size = 58 }: Props) {
  return (
    <Image
      source={require("../assets/logo.jpg")}
      style={[
        styles.image,
        { width: size, height: size, borderRadius: size * 0.28 },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
});
