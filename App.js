import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider } from 'react-native-paper';
import { TouchableOpacity, Image, View, ActivityIndicator, StyleSheet } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

// Import Firebase init
import './firebase';

// Screens
import LandingScreen from './src/screens/LandingScreen';
import ProviderProfileScreen from './src/screens/ProviderProfileScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import EditServicesScreen from './src/screens/EditServicesScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import CheckEmailScreen from './src/screens/CheckEmailScreen';

// Hooks
import { useAuth } from './src/hooks/useAuth';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const theme = {
  colors: {
    primary: '#2E7D32',
    accent: '#4CAF50',
    background: '#FAFAFA',
    surface: '#FFFFFF',
    text: '#212121',
    placeholder: '#757575',
  },
};

// Main Tabs for authenticated users
function MainTabs({ navigation }) {
  const { user } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'Dashboard') iconName = 'search';
          else if (route.name === 'Services') iconName = 'build';
          else if (route.name === 'Notifications') iconName = 'notifications';
          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Dashboard',
          headerRight: () => (
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('Profile', { providerId: user?.uid })
              }
              style={{ marginRight: 10 }}
            >
              <Image
                source={{
                  uri: user?.photoURL || 'https://via.placeholder.com/40',
                }}
                style={{ width: 40, height: 40, borderRadius: 20 }}
              />
            </TouchableOpacity>
          ),
        }}
      />
      <Tab.Screen name="Services" component={EditServicesScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
    </Tab.Navigator>
  );
}

// Auth Stack for unauthenticated users
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Landing" component={LandingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="CheckEmailScreen" component={CheckEmailScreen} />
    </Stack.Navigator>
  );
}

// App Stack for verified users
function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Service Provider',
          headerShown: true,
          headerStyle: { backgroundColor: theme.colors.primary },
          headerTintColor: '#FFFFFF',
        }}
      />
    </Stack.Navigator>
  );
}

// Stack for unverified users
function UnverifiedStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CheckEmailScreen" component={CheckEmailScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}

// Splash screen for loading state
function SplashScreen() {
  return (
    <View style={styles.splashContainer}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    console.log('🔄 Auth loading...');
    return <SplashScreen />;
  }

  console.log('👤 User state:', user ? `Authenticated (emailVerified: ${user.emailVerified})` : 'Unauthenticated');

  return (
    <PaperProvider theme={theme}>
      <NavigationContainer>
        {user ? (
          user.emailVerified ? (
            <AppStack />
          ) : (
            <UnverifiedStack />
          )
        ) : (
          <AuthStack />
        )}
      </NavigationContainer>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
});