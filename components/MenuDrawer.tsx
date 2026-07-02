import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
} from "react-native";
import { router, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMenu } from "../contexts/MenuContext";
import { useSession } from "../contexts/SessionContext";
import { COLORS } from "../constants/design";

const DRAWER_WIDTH = Math.min(Dimensions.get("window").width * 0.78, 300);

const NAV_ITEMS = [
  { route: "/(tabs)/home",     label: "Übersicht",    icon: "stats-chart-outline",    activeIcon: "stats-chart" },
  { route: "/(tabs)/kalender", label: "Kalender",     icon: "calendar-outline",       activeIcon: "calendar" },
  { route: "/mitglieder",      label: "Mitglieder",   icon: "people-outline",         activeIcon: "people" },
  { route: "/(tabs)/chat",     label: "Der Sepp",     icon: "chatbubbles-outline",    activeIcon: "chatbubbles" },
  { route: "/kasse",           label: "Kasse",        icon: "wallet-outline",         activeIcon: "wallet" },
  { route: "/ranglisten",      label: "Ranglisten",   icon: "trophy-outline",         activeIcon: "trophy" },
  { route: "/protokolle",      label: "Protokolle",   icon: "document-text-outline",  activeIcon: "document-text" },
  { route: "/(tabs)/memories", label: "Chronik",      icon: "book-outline",           activeIcon: "book" },
  { route: "/satzung",         label: "Satzung",        icon: "document-text-outline",  activeIcon: "document-text" },
  { route: "/(tabs)/guide",    label: "Einstellungen", icon: "settings-outline",       activeIcon: "settings" },
] as const;

export function MenuDrawer() {
  const { menuOpen, closeMenu } = useMenu();
  const { activeMember } = useSession();
  const pathname = usePathname();
  const [modalVisible, setModalVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (menuOpen) {
      setModalVisible(true);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 70,
          friction: 11,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: -DRAWER_WIDTH,
          useNativeDriver: true,
          tension: 70,
          friction: 11,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(() => setModalVisible(false));
    }
  }, [menuOpen]);

  function navigate(route: string) {
    closeMenu();
    setTimeout(() => router.push(route as never), 50);
  }

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      onRequestClose={closeMenu}
      statusBarTranslucent
    >
      <View style={styles.root}>
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeMenu} activeOpacity={1} />
        </Animated.View>

        {/* Drawer */}
        <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>
          <SafeAreaView style={styles.drawerInner} edges={["top", "bottom", "left"]}>

            {/* Header */}
            <View style={styles.drawerHeader}>
              {activeMember ? (
                <View style={styles.memberInfo}>
                  <View style={[styles.memberAvatar, { backgroundColor: activeMember.avatarColor }]}>
                    <Text style={styles.memberAvatarLetter}>
                      {activeMember.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.drawerTitle}>{activeMember.name}</Text>
                    <Text style={styles.drawerSub}>
                      {activeMember.spitzname ? `„${activeMember.spitzname}" · ` : ""}
                      {activeMember.rolle}
                    </Text>
                  </View>
                </View>
              ) : (
                <View>
                  <Text style={styles.drawerTitle}>🍺 Die Hellen</Text>
                  <Text style={styles.drawerSub}>Stammtisch-App</Text>
                </View>
              )}
              <TouchableOpacity onPress={closeMenu} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={styles.headerDivider} />

            {/* Nav Items */}
            <View style={styles.navList}>
              {NAV_ITEMS.map((item) => {
                const isActive = pathname.startsWith(item.route.replace("(tabs)/", ""));
                return (
                  <TouchableOpacity
                    key={item.route}
                    style={[styles.navItem, isActive && styles.navItemActive]}
                    onPress={() => navigate(item.route)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.navIconBox, isActive && styles.navIconBoxActive]}>
                      <Ionicons
                        name={(isActive ? item.activeIcon : item.icon) as never}
                        size={20}
                        color={isActive ? COLORS.blue : "rgba(255,255,255,0.65)"}
                      />
                    </View>
                    <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                      {item.label}
                    </Text>
                    {isActive && (
                      <View style={styles.activeIndicator} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Footer */}
            <View style={styles.drawerFooter}>
              <View style={styles.footerDivider} />
              <TouchableOpacity
                style={styles.profilWechseln}
                onPress={() => { closeMenu(); setTimeout(() => router.push("/mitglied-waehlen"), 50); }}
                activeOpacity={0.75}
              >
                <Ionicons name="swap-horizontal-outline" size={16} color="rgba(255,255,255,0.5)" />
                <Text style={styles.profilWechselnText}>Profil wechseln</Text>
              </TouchableOpacity>
            </View>

          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: "row",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.48)",
  },
  drawer: {
    width: DRAWER_WIDTH,
    backgroundColor: COLORS.blueDark,
    shadowColor: "#000",
    shadowOffset: { width: 6, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 20,
  },
  drawerInner: {
    flex: 1,
  },

  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 10,
  },
  memberInfo: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  memberAvatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  memberAvatarLetter: { fontSize: 17, fontWeight: "700", color: "#FFFFFF" },
  drawerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  drawerSub: {
    fontSize: 11,
    color: COLORS.gold,
    fontWeight: "600",
    marginTop: 1,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },

  headerDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginHorizontal: 16,
    marginBottom: 10,
  },

  navList: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 6,
    gap: 2,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderRadius: 14,
  },
  navItemActive: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  navIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  navIconBoxActive: {
    backgroundColor: COLORS.gold,
  },
  navLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "rgba(255,255,255,0.65)",
  },
  navLabelActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  activeIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.gold,
  },

  drawerFooter: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  footerDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginBottom: 12,
  },
  profilWechseln: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 8,
  },
  profilWechselnText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.45)",
    fontWeight: "600",
  },
});
