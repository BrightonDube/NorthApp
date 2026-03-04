/**
 * Admin Screen
 * 
 * Management screen for administrators to manage users and subscriptions.
 * Only accessible by users with admin role (max account).
 * 
 * Features:
 * - View all users
 * - Manage subscription status
 * - Grant/revoke Pro access
 * - View user statistics
 * 
 * Validates: Admin management requirements
 */

import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Alert, ActivityIndicator, StyleSheet, TextInput, Modal, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { useThemeColors } from '@/contexts/ThemeContext';

// Admin access is controlled by the is_admin flag in the profiles table.
// See convertUser() in authStore.ts which fetches is_admin on login.

interface ManagedUser {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
  is_pro: boolean;
  pro_expires_at: string | null;
}

/**
 * User Row Component
 */
function UserRow({ 
  user, 
  onTogglePro, 
  isUpdating,
  colors 
}: { 
  user: ManagedUser; 
  onTogglePro: (userId: string, currentStatus: boolean) => void;
  isUpdating: boolean;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const formattedDate = new Date(user.created_at).toLocaleDateString();
  
  return (
    <View style={[styles.userRow, { backgroundColor: colors.card }]}>
      <View style={styles.userInfo}>
        <View style={[styles.userAvatar, { backgroundColor: colors.text }]}>
          <Text style={[styles.avatarText, { color: colors.background }]}>
            {(user.name || user.email)?.[0]?.toUpperCase() || '?'}
          </Text>
        </View>
        <View style={styles.userDetails}>
          <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
            {user.name || 'No name'}
          </Text>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]} numberOfLines={1}>
            {user.email}
          </Text>
          <Text style={[styles.userJoined, { color: colors.textTertiary }]}>
            Joined {formattedDate}
          </Text>
        </View>
      </View>
      
      <View style={styles.userActions}>
        <View style={[
          styles.statusBadge,
          user.is_pro ? { backgroundColor: colors.text } : { backgroundColor: colors.border }
        ]}>
          <Text style={[
            styles.statusText,
            user.is_pro ? { color: colors.background } : { color: colors.textSecondary }
          ]}>
            {user.is_pro ? 'PRO' : 'FREE'}
          </Text>
        </View>
        
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onTogglePro(user.id, user.is_pro);
          }}
          disabled={isUpdating}
          style={({ pressed }) => [
            styles.toggleButton,
            user.is_pro ? styles.toggleButtonRevoke : styles.toggleButtonGrant,
            pressed && styles.toggleButtonPressed,
            isUpdating && styles.toggleButtonDisabled,
          ]}
        >
          {isUpdating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.toggleButtonText}>
              {user.is_pro ? 'Revoke' : 'Grant Pro'}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

/**
 * Statistics Card Component
 */
function StatCard({ label, value, icon, colors }: { 
  label: string; 
  value: string | number; 
  icon: string;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card }]}>
      <Ionicons name={icon as any} size={24} color={colors.text} />
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

export default function AdminScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const colors = useThemeColors();
  
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    totalUsers: 0,
    proUsers: 0,
    freeUsers: 0,
  });
  
  // Check if current user is admin
  const isAdmin = user?.isAdmin === true;
  
  // Redirect non-admin users
  useEffect(() => {
    if (!isLoading && !isAdmin) {
      Alert.alert(
        'Access Denied',
        'You do not have permission to access this screen.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
  }, [isAdmin, isLoading]);
  
  // Fetch users
  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;
    
    try {
      // Fetch all profiles with subscription info
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, created_at')
        .order('created_at', { ascending: false });
      
      if (profilesError) throw profilesError;
      
      // Fetch auth users to get emails (this requires admin access in Supabase)
      // For now, we'll use a workaround by storing email in profiles
      const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
      
      let userList: ManagedUser[] = [];
      
      if (authData?.users) {
        // Map auth users with profile data
        userList = authData.users.map(authUser => {
          const profile = profiles?.find(p => p.id === authUser.id);
          return {
            id: authUser.id,
            email: authUser.email || '',
            name: profile?.name || null,
            created_at: authUser.created_at || profile?.created_at || new Date().toISOString(),
            is_pro: false, // Will be updated from subscription data
            pro_expires_at: null,
          };
        });
      } else if (profiles) {
        // Fallback if we can't access auth users
        userList = profiles.map(profile => ({
          id: profile.id,
          email: 'Email hidden',
          name: profile.name,
          created_at: profile.created_at,
          is_pro: false,
          pro_expires_at: null,
        }));
      }
      
      // Fetch subscription status from RevenueCat or local tracking
      // For simplicity, we'll check a subscriptions table if it exists
      const { data: subscriptions } = await (supabase as any)
        .from('user_subscriptions')
        .select('user_id, is_active, expires_at');
      
      if (subscriptions) {
        userList = userList.map(user => {
          const sub = subscriptions.find((s: any) => s.user_id === user.id);
          return {
            ...user,
            is_pro: sub?.is_active ?? false,
            pro_expires_at: sub?.expires_at ?? null,
          };
        });
      }
      
      setUsers(userList);
      
      // Calculate stats
      const proCount = userList.filter(u => u.is_pro).length;
      setStats({
        totalUsers: userList.length,
        proUsers: proCount,
        freeUsers: userList.length - proCount,
      });
      
    } catch (error) {
      console.error('Error fetching users:', error);
      // If admin API fails, try alternative approach
      try {
        const { data: profiles } = await (supabase as any)
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (profiles) {
          const userList = profiles.map((p: any) => ({
            id: p.id,
            email: p.email || 'Email not available',
            name: p.name,
            created_at: p.created_at,
            is_pro: p.is_pro || false,
            pro_expires_at: null,
          }));
          
          setUsers(userList);
          
          const proCount = userList.filter((u: any) => u.is_pro).length;
          setStats({
            totalUsers: userList.length,
            proUsers: proCount,
            freeUsers: userList.length - proCount,
          });
        }
      } catch (fallbackError) {
        console.error('Fallback fetch also failed:', fallbackError);
        Alert.alert('Error', 'Failed to load users. Please check your admin permissions.');
      }
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin]);
  
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);
  
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUsers();
  }, [fetchUsers]);
  
  // Toggle Pro status
  const handleTogglePro = async (userId: string, currentStatus: boolean) => {
    const action = currentStatus ? 'revoke Pro from' : 'grant Pro to';
    const targetUser = users.find(u => u.id === userId);
    
    Alert.alert(
      `${currentStatus ? 'Revoke' : 'Grant'} Pro Access`,
      `Are you sure you want to ${action} ${targetUser?.name || targetUser?.email || 'this user'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: currentStatus ? 'destructive' : 'default',
          onPress: async () => {
            setUpdatingUserId(userId);
            
            try {
              // Update in user_subscriptions table
              const { error } = await (supabase as any)
                .from('user_subscriptions')
                .upsert({
                  user_id: userId,
                  is_active: !currentStatus,
                  updated_at: new Date().toISOString(),
                  // If granting, set expiration to 1 year from now
                  expires_at: !currentStatus 
                    ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
                    : null,
                });
              
              if (error) throw error;
              
              // Also update profiles table for fallback
              await supabase
                .from('profiles')
                .update({ is_pro: !currentStatus })
                .eq('id', userId);
              
              // Update local state
              setUsers(prev => prev.map(u => 
                u.id === userId 
                  ? { ...u, is_pro: !currentStatus }
                  : u
              ));
              
              // Update stats
              setStats(prev => ({
                ...prev,
                proUsers: prev.proUsers + (currentStatus ? -1 : 1),
                freeUsers: prev.freeUsers + (currentStatus ? 1 : -1),
              }));
              
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert(
                'Success',
                `Pro access ${currentStatus ? 'revoked from' : 'granted to'} user.`
              );
              
            } catch (error) {
              console.error('Error updating user:', error);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert('Error', 'Failed to update user subscription status.');
            } finally {
              setUpdatingUserId(null);
            }
          },
        },
      ]
    );
  };
  
  // Filter users by search
  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Non-admin view
  if (!isAdmin) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.accessDenied}>
          <Ionicons name="lock-closed" size={64} color={colors.border} />
          <Text style={[styles.accessDeniedTitle, { color: colors.text }]}>Access Denied</Text>
          <Text style={[styles.accessDeniedText, { color: colors.textSecondary }]}>
            You do not have permission to access this screen.
          </Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.text}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Admin Dashboard</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Manage users and subscriptions</Text>
          </View>
          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark" size={16} color="#FFFFFF" />
            <Text style={styles.adminBadgeText}>ADMIN</Text>
          </View>
        </View>
        
        {/* Statistics */}
        <View style={styles.statsContainer}>
          <StatCard 
            label="Total Users" 
            value={stats.totalUsers} 
            icon="people-outline"
            colors={colors}
          />
          <StatCard 
            label="Pro Users" 
            value={stats.proUsers} 
            icon="diamond-outline"
            colors={colors}
          />
          <StatCard 
            label="Free Users" 
            value={stats.freeUsers} 
            icon="person-outline"
            colors={colors}
          />
        </View>
        
        {/* Search */}
        <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search users by name or email..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>
        
        {/* Users List */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Users ({filteredUsers.length})
        </Text>
        
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.text} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading users...</Text>
          </View>
        ) : filteredUsers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {searchQuery ? 'No users match your search' : 'No users found'}
            </Text>
          </View>
        ) : (
          <View style={styles.usersList}>
            {filteredUsers.map(user => (
              <UserRow
                key={user.id}
                user={user}
                onTogglePro={handleTogglePro}
                isUpdating={updatingUserId === user.id}
                colors={colors}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 16,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  adminBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 12,
  },
  usersList: {
    gap: 12,
  },
  userRow: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  userJoined: {
    fontSize: 11,
    marginTop: 2,
  },
  userActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  toggleButtonGrant: {
    backgroundColor: '#10B981',
  },
  toggleButtonRevoke: {
    backgroundColor: '#EF4444',
  },
  toggleButtonPressed: {
    opacity: 0.8,
  },
  toggleButtonDisabled: {
    opacity: 0.5,
  },
  toggleButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  accessDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
  },
  accessDeniedText: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
  },
});
