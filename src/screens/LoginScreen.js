import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import {
  TextInput,
  Button,
  Title,
  HelperText,
  Text,
  ActivityIndicator,
  IconButton,
  Divider,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons'; // Added for CustomIcon
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  fetchSignInMethodsForEmail,
  sendEmailVerification,
  reload,
} from 'firebase/auth';
import { auth } from '../../firebase';

const { width } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockTimeRemaining, setBlockTimeRemaining] = useState(0);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Initial animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    // Handle login attempt blocking
    if (isBlocked && blockTimeRemaining > 0) {
      const timer = setTimeout(() => {
        setBlockTimeRemaining(blockTimeRemaining - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (blockTimeRemaining === 0 && isBlocked) {
      setIsBlocked(false);
      setLoginAttempts(0);
    }
  }, [blockTimeRemaining, isBlocked]);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const validateForm = () => {
    console.log('🔍 Starting login form validation...');
    const newErrors = {};

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
      console.log('❌ Validation error: Email is required');
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
      console.log('❌ Validation error: Invalid email format');
    } else if (formData.email.trim().length > 320) {
      newErrors.email = 'Email address is too long';
      console.log('❌ Validation error: Email too long');
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
      console.log('❌ Validation error: Password is required');
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      console.log('❌ Validation error: Password too short');
    }

    console.log('✅ Login form validation completed. Errors found:', Object.keys(newErrors).length);
    return newErrors;
  };

  const shakeAnimation = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const handleLogin = async () => {
    console.log('🚀 Starting login process...');
    console.log('📝 Form data:', {
      email: formData.email,
      passwordLength: formData.password.length,
      loginAttempts: loginAttempts,
    });

    // Check if user is blocked
    if (isBlocked) {
      console.log('🚫 User is blocked due to too many failed attempts');
      Alert.alert(
        'Too Many Attempts',
        `Please wait ${blockTimeRemaining} seconds before trying again.`,
        [{ text: 'OK' }],
      );
      shakeAnimation();
      return;
    }

    setErrors({});
    setLoginError('');

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      console.log('❌ Form validation failed, stopping login');
      setErrors(validationErrors);
      shakeAnimation();
      return;
    }

    console.log('✅ Form validation passed, proceeding with login');
    setLoading(true);

    try {
      const emailTrimmed = formData.email.trim().toLowerCase();
      console.log('📧 Trimmed email:', emailTrimmed);

      console.log('✅ Attempting login...');

      // Attempt login first
      const userCredential = await signInWithEmailAndPassword(auth, emailTrimmed, formData.password);
      const user = userCredential.user;
      console.log('✅ Login successful:', user.uid);

      // Reload user to get the latest emailVerified status
      console.log('🔄 Reloading user to check latest verification status...');
      await reload(user);

      console.log('📧 Email verified status:', user.emailVerified);

      // Check email verification
      if (!user.emailVerified) {
        console.log('⚠️ Email not verified');

        Alert.alert(
          'Email Not Verified',
          'Please check your email and click the verification link before logging in. Would you like us to resend the verification email?',
          [
            {
              text: 'Resend Email',
              onPress: async () => {
                try {
                  await sendEmailVerification(user);
                  Alert.alert(
                    'Email Sent',
                    'A new verification email has been sent. Please check your email and click the link to verify your account.',
                    [{ text: 'OK' }],
                  );
                } catch (error) {
                  console.error('Error sending verification email:', error);
                  Alert.alert(
                    'Error',
                    'Failed to send verification email. Please try again.',
                    [{ text: 'OK' }],
                  );
                }
              },
            },
            {
              text: 'I Already Verified',
              onPress: async () => {
                // Give user option to retry login after verification
                try {
                  console.log('🔄 User claims to have verified, reloading user...');
                  await reload(user);
                  if (user.emailVerified) {
                    console.log('✅ Email is now verified, proceeding...');
                    // Reset login attempts on successful login
                    setLoginAttempts(0);
                    setIsBlocked(false);
                    console.log('✅ Login process completed successfully');
                    // Don't sign out, let them proceed
                    return;
                  } else {
                    console.log('❌ Email still not verified');
                    Alert.alert(
                      'Still Not Verified',
                      'Your email is still not verified. Please check your email and click the verification link.',
                      [{ text: 'OK' }],
                    );
                    await auth.signOut();
                  }
                } catch (error) {
                  console.error('Error reloading user:', error);
                  await auth.signOut();
                }
              },
            },
            {
              text: 'OK',
              onPress: async () => {
                await auth.signOut();
              },
            },
          ],
        );
        return;
      }

      // Reset login attempts on successful login
      setLoginAttempts(0);
      setIsBlocked(false);

      console.log('✅ Login process completed successfully');
    } catch (error) {
      console.error('💥 Login error occurred:', error);
      console.error('💥 Error code:', error.code);
      console.error('💥 Error message:', error.message);

      // Increment login attempts
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);

      // Block user after 5 failed attempts
      if (newAttempts >= 5) {
        console.log('🚫 Too many failed attempts, blocking user');
        setIsBlocked(true);
        setBlockTimeRemaining(300); // 5 minutes
      }

      let errorMessage = 'An unexpected error occurred. Please try again.';

      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email address. Please check your email or sign up.';
          console.log('💥 Firebase error: User not found');
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password. Please try again or reset your password.';
          console.log('💥 Firebase error: Wrong password');
          break;
        case 'auth/invalid-email':
          errorMessage = 'The email address is not valid. Please check and try again.';
          console.log('💥 Firebase error: Invalid email');
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled. Please contact support.';
          console.log('💥 Firebase error: User disabled');
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed login attempts. Please wait before trying again.';
          console.log('💥 Firebase error: Too many requests');
          setIsBlocked(true);
          setBlockTimeRemaining(180); // 3 minutes
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your internet connection and try again.';
          console.log('💥 Firebase error: Network request failed');
          break;
        case 'auth/invalid-credential':
          errorMessage = 'Invalid login credentials. Please check your email and password.';
          console.log('💥 Firebase error: Invalid credential');
          break;
        default:
          if (
            error.message.toLowerCase().includes('network') ||
            error.message.toLowerCase().includes('connection')
          ) {
            errorMessage = 'No internet connection. Please check your network and try again.';
            console.log('💥 Network connectivity error detected');
          } else {
            errorMessage = `Login failed: ${error.message}`;
            console.log('💥 Unknown error:', error.message);
          }
          break;
      }

      console.log('📢 Setting error message:', errorMessage);
      setLoginError(errorMessage);
      shakeAnimation();

      Alert.alert('Login Failed', errorMessage, [
        {
          text: 'OK',
          onPress: () => console.log('✅ User dismissed login error alert'),
        },
      ]);
    } finally {
      console.log('🏁 Login process completed, stopping loading...');
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    console.log('🔐 Starting password reset process...');

    if (!formData.email.trim()) {
      Alert.alert('Email Required', 'Please enter your email address first.', [{ text: 'OK' }]);
      return;
    }

    if (!validateEmail(formData.email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.', [{ text: 'OK' }]);
      return;
    }

    setResetLoading(true);

    try {
      const emailTrimmed = formData.email.trim().toLowerCase();
      console.log('📧 Sending password reset email to:', emailTrimmed);

      await sendPasswordResetEmail(auth, emailTrimmed);
      console.log('✅ Password reset email sent successfully');

      Alert.alert(
        'Reset Email Sent',
        'Password reset instructions have been sent to your email address.',
        [{ text: 'OK' }],
      );
    } catch (error) {
      console.error('💥 Password reset error:', error);

      let errorMessage = 'Failed to send reset email. Please try again.';

      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email address.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many requests. Please wait before trying again.';
          break;
        default:
          errorMessage = `Reset failed: ${error.message}`;
          break;
      }

      Alert.alert('Reset Failed', errorMessage, [{ text: 'OK' }]);
    } finally {
      setResetLoading(false);
    }
  };

  const updateFormData = (field, value) => {
    console.log(`📝 Updating login form field "${field}"`);
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear login error when user starts typing
    if (loginError) {
      setLoginError('');
    }

    // Clear field-specific error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Custom Icon component for consistent rendering
  const CustomIcon = ({ name, size = 24, color = '#666', ...props }) => {
    console.log(`🎨 Rendering icon: ${name}`);
    return <MaterialCommunityIcons name={name} size={size} color={color} {...props} />;
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { translateX: shakeAnim }],
            },
          ]}
        >
          <Title style={styles.title}>Welcome Back</Title>
          <Text style={styles.subtitle}>Sign in to your account</Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.form,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Login attempts warning */}
          {loginAttempts > 2 && !isBlocked && (
            <View style={styles.warningContainer}>
              <Text style={styles.warningText}>
                ⚠️ {5 - loginAttempts} attempts remaining before temporary lockout
              </Text>
            </View>
          )}

          {/* Blocked user message */}
          {isBlocked && (
            <View style={styles.blockedContainer}>
              <Text style={styles.blockedText}>
                🚫 Too many failed attempts. Please wait {formatTime(blockTimeRemaining)}
              </Text>
            </View>
          )}

          <TextInput
            label="Email"
            value={formData.email}
            onChangeText={(value) => updateFormData('email', value)}
            mode="outlined"
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={!!errors.email}
            maxLength={320}
            disabled={loading || resetLoading}
            left={<TextInput.Icon icon={() => <CustomIcon name="email" />} />}
          />
          <HelperText type="error" visible={!!errors.email}>
            {errors.email}
          </HelperText>

          <TextInput
            label="Password"
            value={formData.password}
            onChangeText={(value) => updateFormData('password', value)}
            mode="outlined"
            secureTextEntry={!showPassword}
            style={styles.input}
            error={!!errors.password}
            maxLength={128}
            disabled={loading || resetLoading}
            left={<TextInput.Icon icon={() => <CustomIcon name="lock" />} />}
            right={
              <TextInput.Icon
                icon={() => <CustomIcon name={showPassword ? 'eye-off' : 'eye'} />}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
          />
          <HelperText type="error" visible={!!errors.password}>
            {errors.password}
          </HelperText>

          {/* Display login error */}
          {loginError ? (
            <HelperText type="error" visible={true} style={styles.loginError}>
              {loginError}
            </HelperText>
          ) : null}

          {/* Forgot Password Button */}
          <TouchableOpacity
            onPress={handleForgotPassword}
            style={styles.forgotPasswordContainer}
            disabled={loading || resetLoading}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            {resetLoading && (
              <ActivityIndicator size="small" color="#2E7D32" style={styles.resetLoader} />
            )}
          </TouchableOpacity>

          <Button
            mode="contained"
            onPress={handleLogin}
            loading={loading}
            disabled={loading || resetLoading || isBlocked}
            style={[styles.button, isBlocked && styles.disabledButton]}
            contentStyle={styles.buttonContent}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </Button>

          <Divider style={styles.divider} />

          <Button
            mode="text"
            onPress={() => {
              console.log('🧭 Navigating to Signup screen');
              navigation.navigate('Signup');
            }}
            style={styles.linkButton}
            disabled={loading || resetLoading}
          >
            Don't have an account? Sign Up
          </Button>

          <Button
            mode="text"
            onPress={() => {
              console.log('🧭 Navigating to Landing screen');
              navigation.navigate('Landing');
            }}
            style={styles.linkButton}
            disabled={loading || resetLoading}
          >
            Back to Home
          </Button>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  input: {
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  button: {
    marginTop: 20,
    paddingVertical: 8,
    backgroundColor: '#2E7D32',
  },
  buttonContent: {
    paddingVertical: 4,
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  linkButton: {
    marginTop: 10,
  },
  loginError: {
    marginTop: 10,
    marginBottom: 10,
    fontSize: 14,
    backgroundColor: '#FFEBEE',
    color: '#C62828',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    textAlign: 'center',
    fontWeight: '500',
  },
  forgotPasswordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
    marginBottom: 4,
  },
  forgotPasswordText: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: '500',
  },
  resetLoader: {
    marginLeft: 8,
  },
  divider: {
    marginVertical: 20,
    backgroundColor: '#E0E0E0',
  },
  warningContainer: {
    backgroundColor: '#FFF3CD',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFEAA7',
    marginBottom: 16,
  },
  warningText: {
    color: '#856404',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  blockedContainer: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    marginBottom: 16,
  },
  blockedText: {
    color: '#C62828',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
});