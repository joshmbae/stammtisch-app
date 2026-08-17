import AsyncStorage from "@react-native-async-storage/async-storage";

function appIntroSeenKey(memberId: string): string {
  return `st_app_intro_seen_${memberId}`;
}

export async function hasSeenAppIntro(memberId: string): Promise<boolean> {
  const value = await AsyncStorage.getItem(appIntroSeenKey(memberId));
  return value === "1";
}

export async function markAppIntroSeen(memberId: string): Promise<void> {
  await AsyncStorage.setItem(appIntroSeenKey(memberId), "1");
}
