import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Alert, RefreshControl, ScrollView } from 'react-native';
import { Text, Button, Card, ActivityIndicator, Snackbar, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getAuth, sendEmailVerification, onAuthStateChanged, reload, signOut } from 'firebase/auth';
import { useFocusEffect } from '@react-navigation/native';

// Constants
const TIMING = {
  RESEND_COOLDOWN: 60,
  RATE_LIMIT_COOLDOWN: 120,
  SUCCESS_DELAY: 1500,
  ALERT_DELAY: 100,
};

const ERROR_MESSAGES = {
  'auth/too-many-requests': 'Too many requests. Please try again later.',
  'auth/user-not-found': 'User not found. Please log in again.',
  'auth/network-request-failed': 'Network error. Please check your connection.',
  default: 'Please try again.',
};

const EMAIL_PROVIDERS = {
  'gmail.com': 'Gmail',
  'yahoo.com': 'Yahoo',
  'outlook.com': 'Outlook',
  'hotmail.com': 'Hotmail',
  'icloud.com': 'iCloud',
};

// Utility functions
const getEmailProvider = (email) => {
  if (!email) return '';
  const domain = email.split('@')[1]?.toLowerCase();
  return EMAIL_PROVIDERS[domain] || 'your email provider';
};

const reloadUserAndCheck = async (user) => {
  await reload(user);
  return user.emailVerified;
};

const signOutAndNavigate = async (auth, navigation) => {
  console.log('🔐 Attempting to sign out and navigate...');
  try {
    if (auth) {
      await signOut(auth);
      console.log('✅ Sign out successful');
    } else {
      console.warn('No auth object provided');
    }
  } catch (error) {
    console.error('Error signing out:', error);
  }
  console.log('🧭 Attempting navigation to Login screen');
  try {
    navigation.replace('Login');
    console.log('✅ Navigation to Login initiated');
  } catch (navError) {
    console.error('Navigation error:', navError);
    throw navError;
  }
};

const handleVerificationSuccess = async (auth, navigation, showSnackbar) => {
  console.log('✅ Email verification confirmed!');
  showSnackbar('Email verified successfully! Redirecting to login... 🎉');
  
  // Sign out the user so they can sign in fresh with verified email
  await signOut(auth);
  
  setTimeout(() => {
    navigation.replace('Login');
  }, TIMING.SUCCESS_DELAY);
};

const showVerificationFailedAlert = (handleResendEmail) => {
  console.log('❌ Email still not verified');
  Alert.alert(
    'Email Not Verified',
    'Your email is still not verified. Please check your email and click the verification link, then try again.',
    [
      {
        text: 'OK',
        onPress: () => console.log('User acknowledged email not verified'),
      },
      {
        text: 'Resend Email',
        onPress: () => {
          console.log('User requested to resend email');
          handleResendEmail();
        },
      },
    ]
  );
};

export default function CheckEmailScreen({ navigation, route }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);
  
  const auth = getAuth();
  const user = auth.currentUser;
  const userEmail = route?.params?.email || user?.email || '';

  // Custom Icon component for consistent rendering
  const CustomIcon = ({ name, size = 24, color = '#666', ...props }) => {
    console.log(`🎨 Rendering icon: ${name}`);
    return <MaterialCommunityIcons name={name} size={size} color={color} {...props} />;
  };

  // Countdown timer for resend button
  useEffect(() => {
    let interval = null;
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown((countdown) => countdown - 1);
      }, 1000);
    } else if (countdown === 0 && interval) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [countdown]);

  // Auto-check verification status when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      checkVerificationStatus();
      
      // Set up auth state listener
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user && user.emailVerified) {
          showSnackbar('Email verified successfully! 🎉');
          // Sign out the user and navigate to login for them to sign in with verified account
          await signOut(auth);
          setTimeout(() => {
            navigation.replace('Login');
          }, TIMING.SUCCESS_DELAY);
        }
      });

      return () => unsubscribe();
    }, [])
  );

  const checkVerificationStatus = async () => {
    if (!user) return;
    
    setIsCheckingVerification(true);
    try {
      console.log('🔄 Checking email verification status...');
      const isVerified = await reloadUserAndCheck(user);
      console.log('📧 Email verified status:', isVerified);
      
      if (isVerified) {
        await handleVerificationSuccess(auth, navigation, showSnackbar);
      } else {
        console.log('❌ Email is not yet verified');
        showSnackbar('Email not yet verified. Please check your email.');
      }
    } catch (error) {
      console.error('Error checking verification status:', error);
      showSnackbar('Error checking verification status. Please try again.');
    } finally {
      setIsCheckingVerification(false);
    }
  };

  const handleResendEmail = async () => {
    if (!user || countdown > 0) return;

    setIsResending(true);
    try {
      console.log('📧 Resending verification email...');
      await sendEmailVerification(user, {
        // Optional: customize the email
        url: 'https://your-app-domain.com', // Replace with your actual app URL
      });
      
      setCountdown(TIMING.RESEND_COOLDOWN);
      showSnackbar('Verification email sent successfully! 📧');
      console.log('✅ Verification email sent successfully');
    } catch (error) {
      console.error('Error sending verification email:', error);
      
      let errorMessage = 'Failed to send verification email. ';
      
      if (error.code === 'auth/too-many-requests') {
        errorMessage += ERROR_MESSAGES[error.code];
        setCountdown(TIMING.RATE_LIMIT_COOLDOWN);
      } else {
        errorMessage += ERROR_MESSAGES[error.code] || ERROR_MESSAGES.default;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  const handleManualRefresh = async () => {
    console.log('🔄 Manual refresh triggered');
    setRefreshing(true);
    await checkVerificationStatus();
    setRefreshing(false);
  };

  const showSnackbar = (message) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const handleGoToLogin = () => {
    console.log('🧭 User requested to go back to login');
    if (!navigation) {
      console.error('Navigation prop is undefined');
      showSnackbar('Navigation error. Please try again.');
      return;
    }

    // Temporarily bypass alert to test navigation
    console.log('✅ Attempting direct navigation to Login');
    try {
      navigation.replace('Login');
      console.log('✅ Direct navigation to Login initiated');
    } catch (error) {
      console.error('Direct navigation error:', error);
      showSnackbar('Failed to navigate to login. Please try again.');
    }
  };

  const handleVerifiedEmail = async () => {
    console.log('👤 User claims they have verified their email');
    if (!user) {
      showSnackbar('No user found. Please log in again.');
      navigation.replace('Login');
      return;
    }

    setIsCheckingVerification(true);
    try {
      console.log('🔄 Reloading user to check latest verification status...');
      const isVerified = await reloadUserAndCheck(user);
      
      if (isVerified) {
        await handleVerificationSuccess(auth, navigation, showSnackbar);
      } else {
        showVerificationFailedAlert(handleResendEmail);
      }
    } catch (error) {
      console.error('Error checking verification:', error);
      showSnackbar('Error checking verification. Please try again.');
    } finally {
      setIsCheckingVerification(false);
    }
  };

  const handleOpenEmailApp = () => {
    Alert.alert(
      'Check Email',
      'Please check your email app and look for the verification email. Don\'t forget to check your spam/junk folder!',
      [{ text: 'OK' }],
    );
  };

  const displayEmail = userEmail || 'your email';
  const emailProvider = getEmailProvider(displayEmail);

  if (!user && !userEmail) {
    return (
      <View style={styles.container}>
        <Card style={styles.card}>
          <Card.Content style={styles.centerContent}>
            <Text style={styles.errorText}>No user found. Please log in again.</Text>
            <Button 
              mode="contained" 
              onPress={() => navigation.replace('Login')}
              style={styles.button}
            >
              Go to Login
            </Button>
          </Card.Content>
        </Card>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleManualRefresh} />
      }
    >
      <Card style={styles.card}>
        <Card.Content>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>📧 Verify Your Email</Text>
            <IconButton
              icon={() => <CustomIcon name="refresh" />}
              onPress={checkVerificationStatus}
              disabled={isCheckingVerification}
            />
          </View>

          {/* Loading indicator for checking verification */}
          {isCheckingVerification && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" />
              <Text style={styles.loadingText}>Checking verification status...</Text>
            </View>
          )}

          {/* Email info */}
          <Text style={styles.message}>
            We've sent a verification link to:
          </Text>
          <Card style={styles.emailCard}>
            <Card.Content style={styles.emailContent}>
              <Text style={styles.email}>{displayEmail}</Text>
              <Text style={styles.provider}>({emailProvider})</Text>
            </Card.Content>
          </Card>

          {/* Instructions */}
          <Text style={styles.instructions}>
            1. Open your email app ({emailProvider})
            {'\n'}2. Look for an email from Firebase
            {'\n'}3. Check your spam/junk folder if not found
            {'\n'}4. Click the verification link
            {'\n'}5. Come back and tap "I've Verified My Email"
          </Text>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              style={[styles.button, styles.primaryButton]}
              onPress={handleOpenEmailApp}
              icon={() => <CustomIcon name="email-open" />}
            >
              Open Email App
            </Button>

            <Button
              mode="outlined"
              style={styles.button}
              onPress={handleResendEmail}
              disabled={countdown > 0 || isResending}
              loading={isResending}
              icon={() => <CustomIcon name="email-send" />}
            >
              {countdown > 0 
                ? `Resend in ${countdown}s` 
                : isResending 
                ? 'Sending...' 
                : 'Resend Email'
              }
            </Button>

            <Button
              mode="contained"
              style={[styles.button, styles.verifyButton]}
              onPress={handleVerifiedEmail}
              disabled={isCheckingVerification}
              loading={isCheckingVerification}
              icon={() => <CustomIcon name="check-circle" />}
            >
              I've Verified My Email
            </Button>
          </View>

          {/* Help section */}
          <Card style={styles.helpCard}>
            <Card.Content>
              <Text style={styles.helpTitle}>Need Help?</Text>
              <Text style={styles.helpText}>
                • Email not received? Check spam/junk folder
                {'\n'}• Link expired? Use "Resend Email" button
                {'\n'}• Still having issues? Try the "I've Verified My Email" button
                {'\n'}• Verification link should work instantly
              </Text>
            </Card.Content>
          </Card>

          {/* Back to login */}
          <Button
            mode="text"
            style={styles.backButton}
            onPress={handleGoToLogin}
            textColor="#666"
            icon={() => <CustomIcon name="arrow-left" />}
          >
            Back to Login
          </Button>
        </Card.Content>
      </Card>

      {/* Snackbar for notifications */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        action={{
          label: 'OK',
          onPress: () => setSnackbarVisible(false),
        }}
      >
        {snackbarMessage}
      </Snackbar>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    elevation: 4,
    borderRadius: 12,
  },
  centerContent: {
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#F44336',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  loadingText: {
    marginLeft: 8,
    color: '#1976D2',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
    color: '#666',
  },
  emailCard: {
    backgroundColor: '#E8F5E8',
    marginBottom: 16,
  },
  emailContent: {
    alignItems: 'center',
  },
  email: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  provider: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 4,
  },
  instructions: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    marginVertical: 4,
  },
  primaryButton: {
    backgroundColor: '#2196F3',
  },
  verifyButton: {
    backgroundColor: '#4CAF50',
  },
  helpCard: {
    backgroundColor: '#F3E5F5',
    marginTop: 20,
    marginBottom: 16,
  },
  helpTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#7B1FA2',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    lineHeight: 18,
    color: '#8E24AA',
  },
  backButton: {
    marginTop: 8,
  },
});