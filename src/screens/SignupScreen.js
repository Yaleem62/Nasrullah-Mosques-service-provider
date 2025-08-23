//SignupScreen.js
import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform, 
  Alert,
  Animated,
  Dimensions,
  TouchableOpacity
} from 'react-native';
import { 
  TextInput, 
  Button, 
  Title, 
  HelperText, 
  Text,
  ProgressBar,
  Divider,
  Chip
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons'; // Added for CustomIcon
import { 
  createUserWithEmailAndPassword, 
  updateProfile, 
  sendEmailVerification, 
  signOut, 
  fetchSignInMethodsForEmail 
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../firebase';

const { width } = Dimensions.get('window');

export default function SignupScreen({ navigation }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [signupError, setSignupError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordRequirements, setPasswordRequirements] = useState({
    length: false,
    lowercase: false,
    uppercase: false,
    number: false,
  });
  const [currentStep, setCurrentStep] = useState(1);
  const [totalSteps] = useState(4);
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState(null);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

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
    // Update progress animation
    Animated.timing(progressAnim, {
      toValue: currentStep / totalSteps,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentStep]);

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const checkPasswordStrength = (password) => {
    console.log('🔐 Checking password strength...');
    let strength = 0;
    const requirements = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
    };

    // Calculate strength
    if (requirements.length) strength += 25;
    if (requirements.lowercase) strength += 25;
    if (requirements.uppercase) strength += 25;
    if (requirements.number) strength += 25;

    // Bonus points for special characters
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      strength = Math.min(100, strength + 10);
    }

    console.log('📊 Password strength:', strength, 'Requirements:', requirements);
    setPasswordStrength(strength);
    setPasswordRequirements(requirements);
    return strength;
  };

  const checkEmailAvailability = async (email) => {
    if (!email.trim() || !validateEmail(email)) {
      setEmailAvailable(null);
      return;
    }

    setEmailChecking(true);
    try {
      const emailTrimmed = email.trim().toLowerCase();
      const existingMethods = await fetchSignInMethodsForEmail(auth, emailTrimmed);
      const available = existingMethods.length === 0;
      setEmailAvailable(available);
      console.log('📧 Email availability check:', emailTrimmed, 'Available:', available);
    } catch (error) {
      console.error('Error checking email availability:', error);
      setEmailAvailable(null);
    } finally {
      setEmailChecking(false);
    }
  };

  const validateForm = () => {
    console.log('🔍 Starting form validation...');
    const newErrors = {};
    let step = 1;
    
    // Name validation - Step 1
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
      console.log('❌ Validation error: Name is required');
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
      console.log('❌ Validation error: Name too short');
    } else if (formData.name.trim().length > 50) {
      newErrors.name = 'Name must be less than 50 characters';
      console.log('❌ Validation error: Name too long');
    } else if (!/^[a-zA-Z\s'-]+$/.test(formData.name.trim())) {
      newErrors.name = 'Name can only contain letters, spaces, hyphens, and apostrophes';
      console.log('❌ Validation error: Invalid name characters');
    } else {
      step = Math.max(step, 2);
    }
    
    // Email validation - Step 2
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
      console.log('❌ Validation error: Email is required');
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
      console.log('❌ Validation error: Invalid email format');
    } else if (formData.email.trim().length > 320) {
      newErrors.email = 'Email address is too long';
      console.log('❌ Validation error: Email too long');
    } else if (emailAvailable === false) {
      newErrors.email = 'This email is already registered';
      console.log('❌ Validation error: Email already exists');
    } else {
      step = Math.max(step, 3);
    }
    
    // Password validation - Step 3
    if (!formData.password) {
      newErrors.password = 'Password is required';
      console.log('❌ Validation error: Password is required');
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      console.log('❌ Validation error: Password too short');
    } else if (formData.password.length > 128) {
      newErrors.password = 'Password must be less than 128 characters';
      console.log('❌ Validation error: Password too long');
    } else if (!/(?=.*[a-z])/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one lowercase letter';
      console.log('❌ Validation error: Password missing lowercase');
    } else if (!/(?=.*[A-Z])/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter';
      console.log('❌ Validation error: Password missing uppercase');
    } else if (!/(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one number';
      console.log('❌ Validation error: Password missing number');
    } else {
      step = Math.max(step, 4);
    }
    
    // Confirm password validation - Step 4
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
      console.log('❌ Validation error: Confirm password is required');
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      console.log('❌ Validation error: Passwords do not match');
    }

    setCurrentStep(step);
    console.log('✅ Form validation completed. Errors found:', Object.keys(newErrors).length, 'Current step:', step);
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

  const getPasswordStrengthColor = (strength) => {
    if (strength < 25) return '#F44336'; // Red
    if (strength < 50) return '#FF9800'; // Orange
    if (strength < 75) return '#FFC107'; // Yellow
    return '#4CAF50'; // Green
  };

  const getPasswordStrengthText = (strength) => {
    if (strength < 25) return 'Weak';
    if (strength < 50) return 'Fair';
    if (strength < 75) return 'Good';
    return 'Strong';
  };

  const handleSignup = async () => {
    console.log('🚀 Starting signup process...');
    console.log('📝 Form data:', {
      name: formData.name,
      email: formData.email,
      passwordLength: formData.password.length,
      confirmPasswordLength: formData.confirmPassword.length
    });

    setErrors({});
    setSignupError('');
    
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

      // Check network connectivity first
      console.log('🌐 Checking network connectivity...');
      
      // Pre-check for existing account
      console.log('🔍 Checking if email already exists...');
      const existingMethods = await fetchSignInMethodsForEmail(auth, emailTrimmed);
      console.log('📊 Existing sign-in methods found:', existingMethods);
      console.log('📊 Number of existing methods:', existingMethods.length);
      
      if (existingMethods.length > 0) {
        console.log('❌ User already exists! Showing error...');
        setLoading(false);
        
        const errorMessage = 'An account with this email already exists. Please log in instead.';
        setSignupError(errorMessage);
        setEmailAvailable(false);
        shakeAnimation();
        
        Alert.alert(
          'Account Already Exists',
          errorMessage,
          [{ 
            text: 'Go to Login', 
            onPress: () => {
              console.log('✅ User chose to go to login');
              navigation.navigate('Login');
            }
          },
          { 
            text: 'Try Different Email', 
            onPress: () => {
              console.log('✅ User chose to try different email');
              setFormData(prev => ({ ...prev, email: '' }));
              setSignupError('');
              setEmailAvailable(null);
            }
          }]
        );
        return;
      }

      console.log('✅ Email is available, proceeding with account creation...');

      // Create account
      console.log('👤 Creating user account...');
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        emailTrimmed,
        formData.password
      );
      const user = userCredential.user;
      console.log('✅ User account created successfully:', user.uid);

      // Set display name
      console.log('📝 Updating user profile...');
      await updateProfile(user, { displayName: formData.name.trim() });
      console.log('✅ User profile updated successfully');

      // Add user to Firestore
      console.log('💾 Adding user to Firestore...');
      await setDoc(doc(db, 'users', user.uid), {
        name: formData.name.trim(),
        email: emailTrimmed,
        services: [],
        profileViews: 0,
        contactsReceived: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      console.log('✅ User added to Firestore successfully');

      // Send verification email
      console.log('📧 Sending verification email...');
      await sendEmailVerification(user);
      console.log('✅ Verification email sent successfully');

      // Force logout until verified
      console.log('🚪 Signing out user until email verification...');
      // await signOut(auth);
      console.log('✅ User signed out successfully');

      // Navigate to "Check Email" screen
      console.log('🧭 Navigating to CheckEmailScreen...');
      navigation.replace('CheckEmailScreen', { email: emailTrimmed });
      console.log('✅ Navigation completed');

    } catch (error) {
      console.error('💥 Signup error occurred:', error);
      console.error('💥 Error code:', error.code);
      console.error('💥 Error message:', error.message);

      let errorMessage = 'An unexpected error occurred. Please try again.';
      
      // Firebase Auth errors
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'An account with this email already exists. Please log in instead.';
          console.log('💥 Firebase error: Email already in use');
          setEmailAvailable(false);
          break;
        case 'auth/invalid-email':
          errorMessage = 'The email address is not valid. Please check and try again.';
          console.log('💥 Firebase error: Invalid email');
          break;
        case 'auth/weak-password':
          errorMessage = 'Password is too weak. Please choose a stronger password with at least 6 characters.';
          console.log('💥 Firebase error: Weak password');
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Email/password accounts are not enabled. Please contact support.';
          console.log('💥 Firebase error: Operation not allowed');
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please wait a few minutes before trying again.';
          console.log('💥 Firebase error: Too many requests');
          break;
        
        // Network errors
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your internet connection and try again.';
          console.log('💥 Firebase error: Network request failed');
          break;
        case 'auth/timeout':
          errorMessage = 'Request timed out. Please check your connection and try again.';
          console.log('💥 Firebase error: Timeout');
          break;
        
        // Firestore errors
        case 'permission-denied':
          errorMessage = 'Permission denied. Please contact support if this persists.';
          console.log('💥 Firestore error: Permission denied');
          break;
        case 'unavailable':
          errorMessage = 'Service temporarily unavailable. Please try again in a few moments.';
          console.log('💥 Firestore error: Service unavailable');
          break;
        
        // Generic errors
        case 'auth/internal-error':
          errorMessage = 'Internal server error. Please try again later.';
          console.log('💥 Firebase error: Internal error');
          break;
        
        default:
          // Check if it's a network connectivity issue
          if (error.message.toLowerCase().includes('network') || 
              error.message.toLowerCase().includes('connection') ||
              error.message.toLowerCase().includes('offline')) {
            errorMessage = 'No internet connection. Please check your network and try again.';
            console.log('💥 Network connectivity error detected');
          } else if (error.message.toLowerCase().includes('cors')) {
            errorMessage = 'Configuration error. Please contact support.';
            console.log('💥 CORS error detected');
          } else {
            errorMessage = `Signup failed: ${error.message}. Please try again.`;
            console.log('💥 Unknown error:', error.message);
          }
          break;
      }

      console.log('📢 Setting error message:', errorMessage);
      setSignupError(errorMessage);
      shakeAnimation();
      
      Alert.alert(
        'Signup Failed', 
        errorMessage,
        [{ 
          text: 'OK', 
          onPress: () => {
            console.log('✅ User dismissed error alert');
          }
        }]
      );
    } finally {
      console.log('🏁 Signup process completed, stopping loading...');
      setLoading(false);
    }
  };

  const updateFormData = (field, value) => {
    console.log(`📝 Updating form field "${field}"`);
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear signup error when user starts typing
    if (signupError) {
      setSignupError('');
    }
    
    // Clear field-specific error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Special handling for password strength
    if (field === 'password') {
      checkPasswordStrength(value);
    }

    // Special handling for email availability
    if (field === 'email') {
      setEmailAvailable(null);
      // Debounce email check
      setTimeout(() => {
        if (formData.email === value) { // Only check if value hasn't changed
          checkEmailAvailability(value);
        }
      }, 1000);
    }

    // Update current step based on form completion
    validateForm();
  };

  // Custom Icon component for consistent rendering
  const CustomIcon = ({ name, size = 24, color = '#666', ...props }) => {
    console.log(`🎨 Rendering icon: ${name}`);
    return <MaterialCommunityIcons name={name} size={size} color={color} {...props} />;
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Animated.View 
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { translateX: shakeAnim }
              ]
            }
          ]}
        >
          <Title style={styles.title}>Create Account</Title>
          <Text style={styles.subtitle}>Join us today and get started</Text>
          
          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              Step {currentStep} of {totalSteps}
            </Text>
            <Animated.View style={styles.progressBarContainer}>
              <ProgressBar 
                progress={progressAnim}
                color="#2E7D32"
                style={styles.progressBar}
              />
            </Animated.View>
          </View>
        </Animated.View>

        <Animated.View 
          style={[
            styles.form,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {/* Name Input */}
          <TextInput
            label="Full Name"
            value={formData.name}
            onChangeText={(value) => updateFormData('name', value)}
            mode="outlined"
            style={styles.input}
            error={!!errors.name}
            maxLength={50}
            disabled={loading}
            left={<TextInput.Icon icon={() => <CustomIcon name="account" />} />}
            right={
              formData.name.trim().length >= 2 && !errors.name ? (
                <TextInput.Icon icon={() => <CustomIcon name="check" color="#4CAF50" />} />
              ) : null
            }
          />
          <HelperText type="error" visible={!!errors.name}>
            {errors.name}
          </HelperText>

          {/* Email Input */}
          <TextInput
            label="Email Address"
            value={formData.email}
            onChangeText={(value) => updateFormData('email', value)}
            mode="outlined"
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={!!errors.email || emailAvailable === false}
            maxLength={320}
            disabled={loading}
            left={<TextInput.Icon icon={() => <CustomIcon name="email" />} />}
            right={
              emailChecking ? (
                <TextInput.Icon icon={() => <CustomIcon name="refresh" />} /> // Changed from "loading" to "refresh"
              ) : emailAvailable === true ? (
                <TextInput.Icon icon={() => <CustomIcon name="check" color="#4CAF50" />} />
              ) : emailAvailable === false ? (
                <TextInput.Icon icon={() => <CustomIcon name="close" color="#F44336" />} />
              ) : null
            }
          />
          <HelperText type="error" visible={!!errors.email || emailAvailable === false}>
            {errors.email || (emailAvailable === false ? 'This email is already registered' : '')}
          </HelperText>
          {emailAvailable === true && (
            <HelperText type="info" visible={true} style={styles.successText}>
              ✅ Email is available
            </HelperText>
          )}

          {/* Password Input */}
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
                icon={() => <CustomIcon name={showPassword ? "eye-off" : "eye"} />}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
          />
          <HelperText type="error" visible={!!errors.password}>
            {errors.password}
          </HelperText>

          {/* Password Strength Indicator */}
          {formData.password.length > 0 && (
            <View style={styles.passwordStrengthContainer}>
              <View style={styles.passwordStrengthHeader}>
                <Text style={styles.passwordStrengthLabel}>
                  Password Strength: {getPasswordStrengthText(passwordStrength)}
                </Text>
                <Text style={[styles.passwordStrengthPercentage, { color: getPasswordStrengthColor(passwordStrength) }]}>
                  {passwordStrength}%
                </Text>
              </View>
              <ProgressBar 
                progress={passwordStrength / 100}
                color={getPasswordStrengthColor(passwordStrength)}
                style={styles.passwordStrengthBar}
              />
              
              {/* Password Requirements */}
              <View style={styles.passwordRequirements}>
                <Chip 
                  icon={() => <CustomIcon name={passwordRequirements.length ? "check" : "close"} />}
                  textStyle={[styles.requirementText, { color: passwordRequirements.length ? '#4CAF50' : '#757575' }]}
                  style={[styles.requirementChip, { backgroundColor: passwordRequirements.length ? '#E8F5E8' : '#F5F5F5' }]}
                  compact
                >
                  8+ characters
                </Chip>
                <Chip 
                  icon={() => <CustomIcon name={passwordRequirements.lowercase ? "check" : "close"} />}
                  textStyle={[styles.requirementText, { color: passwordRequirements.lowercase ? '#4CAF50' : '#757575' }]}
                  style={[styles.requirementChip, { backgroundColor: passwordRequirements.lowercase ? '#E8F5E8' : '#F5F5F5' }]}
                  compact
                >
                  Lowercase
                </Chip>
                <Chip 
                  icon={() => <CustomIcon name={passwordRequirements.uppercase ? "check" : "close"} />}
                  textStyle={[styles.requirementText, { color: passwordRequirements.uppercase ? '#4CAF50' : '#757575' }]}
                  style={[styles.requirementChip, { backgroundColor: passwordRequirements.uppercase ? '#E8F5E8' : '#F5F5F5' }]}
                  compact
                >
                  Uppercase
                </Chip>
                <Chip 
                  icon={() => <CustomIcon name={passwordRequirements.number ? "check" : "close"} />}
                  textStyle={[styles.requirementText, { color: passwordRequirements.number ? '#4CAF50' : '#757575' }]}
                  style={[styles.requirementChip, { backgroundColor: passwordRequirements.number ? '#E8F5E8' : '#F5F5F5' }]}
                  compact
                >
                  Number
                </Chip>
              </View>
            </View>
          )}

          {/* Confirm Password Input */}
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
                icon={() => <CustomIcon name={showConfirmPassword ? "eye-off" : "eye"} />}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              />
            }
          />
          <HelperText type="error" visible={!!errors.confirmPassword}>
            {errors.confirmPassword}
          </HelperText>
          {formData.confirmPassword.length > 0 && formData.password === formData.confirmPassword && (
            <HelperText type="info" visible={true} style={styles.successText}>
              ✅ Passwords match
            </HelperText>
          )}

          {/* Display signup error */}
          {signupError ? (
            <HelperText type="error" visible={true} style={styles.signupError}>
              {signupError}
            </HelperText>
          ) : null}

          <Button
            mode="contained"
            onPress={handleSignup}
            loading={loading}
            disabled={loading || currentStep < totalSteps}
            style={[
              styles.button,
              currentStep < totalSteps && styles.disabledButton
            ]}
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
            <Text>Already have an account? Sign In</Text>
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
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FAFAFA' 
  },
  scrollContent: { 
    flexGrow: 1, 
    justifyContent: 'center', 
    padding: 20 
  },
  header: { 
    alignItems: 'center', 
    marginBottom: 40 
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
    marginBottom: 20,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    color: '#2E7D32',
    marginBottom: 8,
    fontWeight: '500',
  },
  progressBarContainer: {
    width: '80%',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E0E0E0',
  },
  form: { 
    width: '100%' 
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
    marginTop: 10 
  },
  signupError: { 
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
  successText: {
    color: '#4CAF50',
    fontSize: 12,
    marginTop: -8,
    marginBottom: 8,
  },
  divider: {
    marginVertical: 20,
    backgroundColor: '#E0E0E0',
  },
  passwordStrengthContainer: {
    marginTop: 8,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  passwordStrengthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  passwordStrengthLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
  },
  passwordStrengthPercentage: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  passwordRequirements: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  requirementChip: {
    height: 28,
    marginRight: 4,
    marginBottom: 4,
  },
  requirementText: {
    fontSize: 10,
    fontWeight: '500',
  },
});