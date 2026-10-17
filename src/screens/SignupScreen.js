// SignupScreen.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  TouchableOpacity,
} from 'react-native';
import {
  TextInput,
  Button,
  Title,
  HelperText,
  Text,
  ProgressBar,
  Divider,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';

const SignupScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const validateForm = () => {
    console.log('🔍 Starting signup form validation...');
    const newErrors = {};

    // Full Name validation
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
      console.log('❌ Validation error: Full name is required');
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters';
      console.log('❌ Validation error: Full name too short');
    }

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

    // Confirm Password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
      console.log('❌ Validation error: Confirm password is required');
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      console.log('❌ Validation error: Passwords do not match');
    }

    console.log('✅ Signup form validation completed. Errors found:', Object.keys(newErrors).length);
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

  const validatePassword = (pass) => {
    let strength = 0;
    if (pass.length >= 6) strength += 25;
    if (/[A-Z]/.test(pass)) strength += 25;
    if (/[0-9]/.test(pass)) strength += 25;
    if (/[^A-Za-z0-9]/.test(pass)) strength += 25;
    setPasswordStrength(strength);
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 50) return '#FF5722';
    if (passwordStrength < 75) return '#FF9800';
    return '#4CAF50';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength < 25) return 'Very Weak';
    if (passwordStrength < 50) return 'Weak';
    if (passwordStrength < 75) return 'Medium';
    return 'Strong';
  };

  const handleSignup = async () => {
    console.log('🚀 Starting signup process...');
    console.log('📝 Form data:', {
      fullName: formData.fullName,
      email: formData.email,
      passwordLength: formData.password.length,
    });

    setErrors({});

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      console.log('❌ Form validation failed, stopping signup');
      setErrors(validationErrors);
      shakeAnimation();
      return;
    }

    console.log('✅ Form validation passed, proceeding with signup');
    setLoading(true);

    try {
      const emailTrimmed = formData.email.trim().toLowerCase();
      console.log('📧 Trimmed email:', emailTrimmed);

      console.log('✅ Creating user account...');
      const userCredential = await createUserWithEmailAndPassword(auth, emailTrimmed, formData.password);
      const user = userCredential.user;
      console.log('✅ User account created:', user.uid);

      // Save profile in Firestore.
      // `services: []` and the other defaults are required: the search
      // iterates the `services` array of every user doc, and docs created
      // without it made the user permanently unsearchable (the array bug).
      await setDoc(doc(db, 'users', user.uid), {
        name: formData.fullName.trim(), // `name` is the field read by search/dashboard
        fullName: formData.fullName.trim(),
        email: emailTrimmed,
        phone: '',
        services: [],
        profileImage: null,
        profileViews: 0,
        contactsReceived: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log('✅ User profile saved to Firestore');

      // Send email verification
      console.log('📧 Sending email verification...');
      await sendEmailVerification(user);
      console.log('✅ Email verification sent');

      Alert.alert(
        'Account Created Successfully!',
        'A verification email has been sent to your email address. Please verify your email before logging in.',
        [
          {
            text: 'OK',
            onPress: () => {
              console.log('🧭 Navigating to Login screen');
              navigation.navigate('Login');
            },
          },
        ]
      );
    } catch (error) {
      console.error('💥 Signup error occurred:', error);
      console.error('💥 Error code:', error.code);
      console.error('💥 Error message:', error.message);

      let errorMessage = 'An unexpected error occurred. Please try again.';

      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'An account with this email already exists. Please try logging in instead.';
          console.log('💥 Firebase error: Email already in use');
          break;
        case 'auth/invalid-email':
          errorMessage = 'The email address is not valid. Please check and try again.';
          console.log('💥 Firebase error: Invalid email');
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Email/password accounts are not enabled. Please contact support.';
          console.log('💥 Firebase error: Operation not allowed');
          break;
        case 'auth/weak-password':
          errorMessage = 'The password is too weak. Please choose a stronger password.';
          console.log('💥 Firebase error: Weak password');
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your internet connection and try again.';
          console.log('💥 Firebase error: Network request failed');
          break;
        default:
          if (
            error.message.toLowerCase().includes('network') ||
            error.message.toLowerCase().includes('connection')
          ) {
            errorMessage = 'No internet connection. Please check your network and try again.';
            console.log('💥 Network connectivity error detected');
          } else {
            errorMessage = `Signup failed: ${error.message}`;
            console.log('💥 Unknown error:', error.message);
          }
          break;
      }

      console.log('📢 Showing error alert:', errorMessage);
      shakeAnimation();
      Alert.alert('Signup Failed', errorMessage, [
        {
          text: 'OK',
          onPress: () => console.log('✅ User dismissed signup error alert'),
        },
      ]);
    } finally {
      console.log('🏁 Signup process completed, stopping loading...');
      setLoading(false);
    }
  };

  const updateFormData = (field, value) => {
    console.log(`📝 Updating signup form field "${field}"`);
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear field-specific error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }

    // Update password strength for password field
    if (field === 'password') {
      validatePassword(value);
    }

    // Clear confirm password error when either password field changes
    if ((field === 'password' || field === 'confirmPassword') && errors.confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: '' }));
    }
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
          <Title style={styles.title}>Create Account</Title>
          <Text style={styles.subtitle}>Join us today and get started</Text>
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
          <TextInput
            label="Full Name"
            value={formData.fullName}
            onChangeText={(value) => updateFormData('fullName', value)}
            mode="outlined"
            style={styles.input}
            autoCapitalize="words"
            autoCorrect={false}
            error={!!errors.fullName}
            maxLength={100}
            disabled={loading}
            left={<TextInput.Icon icon={() => <CustomIcon name="account" />} />}
          />
          <HelperText type="error" visible={!!errors.fullName}>
            {errors.fullName}
          </HelperText>

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
            disabled={loading}
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
            disabled={loading}
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

          {/* Password strength indicator */}
          {formData.password !== '' && (
            <View style={styles.passwordStrengthContainer}>
              <ProgressBar
                progress={passwordStrength / 100}
                color={getPasswordStrengthColor()}
                style={styles.passwordBar}
              />
              <Text style={[styles.strengthText, { color: getPasswordStrengthColor() }]}>
                Password Strength: {getPasswordStrengthText()}
              </Text>
              <HelperText type="info" visible={true} style={styles.passwordHint}>
                Password should contain uppercase, lowercase, numbers, and special characters
              </HelperText>
            </View>
          )}

          <TextInput
            label="Confirm Password"
            value={formData.confirmPassword}
            onChangeText={(value) => updateFormData('confirmPassword', value)}
            mode="outlined"
            secureTextEntry={!showConfirmPassword}
            style={styles.input}
            error={!!errors.confirmPassword}
            maxLength={128}
            disabled={loading}
            left={<TextInput.Icon icon={() => <CustomIcon name="lock-check" />} />}
            right={
              <TextInput.Icon
                icon={() => <CustomIcon name={showConfirmPassword ? 'eye-off' : 'eye'} />}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              />
            }
          />
          <HelperText type="error" visible={!!errors.confirmPassword}>
            {errors.confirmPassword}
          </HelperText>

          <Button
            mode="contained"
            onPress={handleSignup}
            loading={loading}
            disabled={loading}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </Button>

          <Divider style={styles.divider} />

          <Button
            mode="text"
            onPress={() => {
              console.log('🧭 Navigating to Login screen');
              navigation.navigate('Login');
            }}
            style={styles.linkButton}
            disabled={loading}
          >
            Already have an account? Sign In
          </Button>

          <Button
            mode="text"
            onPress={() => {
              console.log('🧭 Navigating to Landing screen');
              navigation.navigate('Landing');
            }}
            style={styles.linkButton}
            disabled={loading}
          >
            Back to Home
          </Button>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default SignupScreen;

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
  passwordStrengthContainer: {
    marginBottom: 10,
  },
  passwordBar: {
    height: 6,
    borderRadius: 3,
    marginBottom: 5,
    backgroundColor: '#E0E0E0',
  },
  strengthText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  passwordHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 0,
    marginBottom: 5,
  },
  button: {
    marginTop: 20,
    paddingVertical: 8,
    backgroundColor: '#2E7D32',
  },
  buttonContent: {
    paddingVertical: 4,
  },
  linkButton: {
    marginTop: 10,
  },
  divider: {
    marginVertical: 20,
    backgroundColor: '#E0E0E0',
  },
});