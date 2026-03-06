/**
 * SideMenu Component
 * 
 * Animated sidebar that slides in from the left when the hamburger menu is tapped.
 * Contains navigation links to screens hidden from the tab bar (Context, Marketplace, etc.)
 * Includes a backdrop overlay that dismisses the menu on tap.
 */

import { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useAuthStore } from '@/stores/authStore';

const SCREEN_WIDTH = Dimensions.get('window').width;
const MENU_WIDTH = SCREEN_WIDTH * 0.75;
const ANIMATION_DURATION = 280;

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  description: string;
  adminOnly?: boolean;
}

const MENU_ITEMS: MenuItem[] = [
  {
    label: 'Marketplace',
    icon: 'storefront-outline',
    route: '/marketplace',
    description: 'Browse & download coaches',
  },
  {
    label: 'Context',
    icon: 'documents-outline',
    route: '/context',
    description: 'Manage files & knowledge',
  },
  {
    label: 'Session Reports',
    icon: 'document-text-outline',
    route: '/report',
    description: 'View session summaries',
  },
];

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SideMenu({ isOpen, onClose }: SideMenuProps) {
  const colors = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  
  const progress = useSharedValue(0);
  
  useEffect(() => {
    progress.value = withTiming(isOpen ? 1 : 0, {
      duration: ANIMATION_DURATION,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  }, [isOpen]);
  
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 0.5]),
    pointerEvents: progress.value > 0 ? 'auto' as const : 'none' as const,
  }));
  
  const menuStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [-MENU_WIDTH, 0]) },
    ],
  }));
  
  const handleNavigate = (route: string) => {
    onClose();
    // Small delay to let menu close animation start
    setTimeout(() => {
      router.push(route as any);
    }, 150);
  };
  
  const filteredItems = MENU_ITEMS.filter(item => {
    if (item.adminOnly && !user?.isAdmin) return false;
    return true;
  });
  
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={isOpen ? 'auto' : 'none'}>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      
      {/* Menu Panel */}
      <Animated.View
        style={[
          styles.menu,
          menuStyle,
          {
            width: MENU_WIDTH,
            backgroundColor: colors.background,
            borderRightColor: colors.border,
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 16,
          },
        ]}
      >
        {/* Menu Header */}
        <View style={styles.menuHeader}>
          <Text style={[styles.menuTitle, { color: colors.text }]}>North</Text>
          <Text style={[styles.menuSubtitle, { color: colors.textSecondary }]}>
            More features
          </Text>
        </View>
        
        {/* Menu Items */}
        <View style={styles.menuItems}>
          {filteredItems.map((item) => (
            <Pressable
              key={item.route}
              style={({ pressed }) => [
                styles.menuItem,
                { backgroundColor: pressed ? colors.card : 'transparent' },
              ]}
              onPress={() => handleNavigate(item.route)}
              accessibilityRole="button"
              accessibilityLabel={item.label}
            >
              <View style={[styles.menuItemIcon, { backgroundColor: colors.card }]}>
                <Ionicons name={item.icon as any} size={22} color={colors.text} />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={[styles.menuItemLabel, { color: colors.text }]}>
                  {item.label}
                </Text>
                <Text style={[styles.menuItemDesc, { color: colors.textTertiary }]}>
                  {item.description}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </Pressable>
          ))}
        </View>
        
        {/* Footer */}
        <View style={styles.menuFooter}>
          <Text style={[styles.footerText, { color: colors.textTertiary }]}>
            {user?.name || user?.email || 'User'}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

/**
 * HamburgerButton Component
 * 
 * Animated hamburger icon that transitions to an X when the menu is open.
 * Uses three animated bars that rotate and fade to form the X shape.
 */
interface HamburgerButtonProps {
  isOpen: boolean;
  onPress: () => void;
}

export function HamburgerButton({ isOpen, onPress }: HamburgerButtonProps) {
  const colors = useThemeColors();
  const progress = useSharedValue(0);
  
  useEffect(() => {
    progress.value = withTiming(isOpen ? 1 : 0, {
      duration: ANIMATION_DURATION,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  }, [isOpen]);
  
  // Top bar: moves down and rotates 45°
  const topBarStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [0, 7]) },
      { rotate: `${interpolate(progress.value, [0, 1], [0, 45])}deg` },
    ],
  }));
  
  // Middle bar: fades out
  const middleBarStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.3], [1, 0]),
    transform: [
      { scaleX: interpolate(progress.value, [0, 0.3], [1, 0]) },
    ],
  }));
  
  // Bottom bar: moves up and rotates -45°
  const bottomBarStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [0, -7]) },
      { rotate: `${interpolate(progress.value, [0, 1], [0, -45])}deg` },
    ],
  }));
  
  return (
    <Pressable
      onPress={onPress}
      style={styles.hamburgerButton}
      accessibilityRole="button"
      accessibilityLabel={isOpen ? 'Close menu' : 'Open menu'}
      accessibilityState={{ expanded: isOpen }}
      hitSlop={8}
    >
      <View style={styles.hamburgerContainer}>
        <Animated.View style={[styles.hamburgerBar, { backgroundColor: colors.text }, topBarStyle]} />
        <Animated.View style={[styles.hamburgerBar, { backgroundColor: colors.text }, middleBarStyle]} />
        <Animated.View style={[styles.hamburgerBar, { backgroundColor: colors.text }, bottomBarStyle]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Backdrop
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    zIndex: 1,
  },
  // Menu panel
  menu: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 2,
    borderRightWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  menuHeader: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomWidth: 0,
  },
  menuTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  menuSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  menuItems: {
    flex: 1,
    paddingTop: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 0,
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  menuItemDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  menuFooter: {
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 0,
  },
  footerText: {
    fontSize: 13,
  },
  // Hamburger button
  hamburgerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hamburgerContainer: {
    width: 22,
    height: 18,
    justifyContent: 'space-between',
    alignItems: 'stretch',
  },
  hamburgerBar: {
    height: 2,
    borderRadius: 1,
    width: '100%',
  },
});
