import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { RootStack } from './src/navigation';
import { EditorScreen } from './src/screens/EditorScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { TimerScreen } from './src/screens/TimerScreen';
import { useStore } from './src/store';
import { startWatchSync } from './src/watch';
import { color } from './src/theme';

const Stack = createNativeStackNavigator<RootStack>();

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: color.bg, card: color.bg },
};

export default function App() {
  const ready = useStore(s => s.ready);
  const hydrate = useStore(s => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => (ready ? startWatchSync() : undefined), [ready]);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      {ready ? (
        <NavigationContainer theme={theme}>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen
              name="Editor"
              component={EditorScreen}
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen
              name="Timer"
              component={TimerScreen}
              options={{
                presentation: 'fullScreenModal',
                gestureEnabled: false,
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      ) : (
        <View style={styles.splash} />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: color.bg },
});
