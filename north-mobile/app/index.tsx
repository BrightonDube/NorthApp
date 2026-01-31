/**
 * Root Index - Entry Point
 * 
 * This screen is shown briefly during initial load.
 * The actual routing is handled by the _layout.tsx RootLayoutNav component.
 */

import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  // This component is a placeholder while auth state is being determined
  // The _layout.tsx handles all routing logic via useProtectedRoute
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <ActivityIndicator size="large" color="#3B82F6" />
    </View>
  );
}
