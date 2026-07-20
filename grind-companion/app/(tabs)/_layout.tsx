import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useTabFocusRedirect } from '@/src/hooks/useTabFocusRedirect';
import { theme } from '@/src/theme';

function TabFocusRedirect() {
  useTabFocusRedirect();
  return null;
}

export default function TabLayout() {
  return (
    <>
      <TabFocusRedirect />
      <Tabs
      initialRouteName="analytics"
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.textPrimary,
        headerTitleStyle: { fontFamily: theme.fonts.semiBold },
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.secondary,
        tabBarLabelStyle: { fontFamily: theme.fonts.medium, fontSize: 12 },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Grind',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'circle.dashed',
                android: 'adjust',
                web: 'adjust',
              }}
              tintColor={color}
              size={26}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'chart.xyaxis.line',
                android: 'show_chart',
                web: 'show_chart',
              }}
              tintColor={color}
              size={26}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="connect"
        options={{
          title: 'Connect',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'antenna.radiowaves.left.and.right',
                android: 'bluetooth',
                web: 'bluetooth',
              }}
              tintColor={color}
              size={26}
            />
          ),
        }}
      />
    </Tabs>
    </>
  );
}
