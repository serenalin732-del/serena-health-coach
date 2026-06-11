import { Tabs, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { LayoutDashboard, Utensils, TrendingUp, Heart, Settings } from 'lucide-react-native';
import { COLORS, FONTS } from '@/lib/theme';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/lib/i18n';
import { useEffect } from 'react';

export default function TabLayout() {
  const { session, loading } = useAuth();
  const { t } = useI18n();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/auth');
    }
  }, [session, loading]);

  if (!session) return null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.rosePrimary,
        tabBarInactiveTintColor: COLORS.charcoalMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarShowLabel: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('Dashboard'),
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size - 2} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="food"
        options={{
          title: t('Food'),
          tabBarIcon: ({ color, size }) => <Utensils size={size - 2} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="trends"
        options={{
          title: t('Trends'),
          tabBarIcon: ({ color, size }) => <TrendingUp size={size - 2} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="health"
        options={{
          title: t('Health'),
          tabBarIcon: ({ color, size }) => <Heart size={size - 2} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('Settings'),
          tabBarIcon: ({ color, size }) => <Settings size={size - 2} color={color} strokeWidth={2} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.white,
    borderTopColor: COLORS.creamBorder,
    borderTopWidth: 1,
    height: 80,
    paddingBottom: 16,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  tabLabel: {
    fontFamily: FONTS.medium,
    fontSize: 11,
  },
});
