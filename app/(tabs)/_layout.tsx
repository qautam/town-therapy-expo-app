import { Ionicons } from '@expo/vector-icons';
import { Tabs, usePathname } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';

type TabKey = 'home' | 'reports' | 'events' | 'profile';

function resolveActiveTab(pathname: string): TabKey {
  if (pathname.includes('reports')) return 'reports';
  if (pathname.includes('events')) return 'events';
  if (pathname.includes('profile')) return 'profile';
  return 'home';
}

function TabIcon({
  name,
  outlineName,
  highlight,
  label,
}: {
  name: keyof typeof Ionicons.glyphMap;
  outlineName: keyof typeof Ionicons.glyphMap;
  highlight: boolean;
  label: string;
}) {
  const color = highlight ? Colors.primary : Colors.textMuted;

  return (
    <View style={styles.iconWrap}>
      <View style={[styles.iconPill, highlight && styles.iconPillActive]}>
        <Ionicons name={highlight ? name : outlineName} size={24} color={color} />
      </View>
      <Text style={[styles.label, { color }, highlight && styles.labelFocused]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const activeTab = resolveActiveTab(pathname);
  const bottomPad = Math.max(insets.bottom, 10);
  const tabBarHeight = 58 + bottomPad;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: 'none',
        sceneStyle: { backgroundColor: Colors.greenLight },
        freezeOnBlur: true,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarHideOnKeyboard: true,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: Colors.border,
          height: tabBarHeight,
          paddingBottom: bottomPad,
          paddingTop: 8,
          overflow: 'visible',
          elevation: 8,
          shadowColor: '#1A2F2F',
          shadowOpacity: 0.06,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: -2 },
        },
        tabBarItemStyle: {
          paddingTop: 0,
          overflow: 'visible',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarAccessibilityLabel: 'Home',
          tabBarIcon: () => (
            <TabIcon
              name="home"
              outlineName="home-outline"
              highlight={activeTab === 'home'}
              label="Home"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarAccessibilityLabel: 'Reports',
          tabBarIcon: () => (
            <TabIcon
              name="alert-circle"
              outlineName="alert-circle-outline"
              highlight={activeTab === 'reports'}
              label="Reports"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          tabBarAccessibilityLabel: 'Events',
          tabBarIcon: () => (
            <TabIcon
              name="calendar"
              outlineName="calendar-outline"
              highlight={activeTab === 'events'}
              label="Events"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarAccessibilityLabel: 'Profile',
          tabBarIcon: () => (
            <TabIcon
              name="person"
              outlineName="person-outline"
              highlight={activeTab === 'profile'}
              label="You"
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 56,
    marginTop: -10,
  },
  iconPill: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconPillActive: {
    backgroundColor: Colors.greenLight,
    borderColor: Colors.primary,
    transform: [{ translateY: -2 }, { scale: 1.06 }],
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  labelFocused: {
    fontWeight: '700',
  },
});
