import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { TextInput, Button, Title, Paragraph, ActivityIndicator, Card } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getAuth , signOut} from 'firebase/auth';
import { doc, getDoc, setDoc, increment } from 'firebase/firestore';
import { db } from '../../firebase';
const CLOUD_NAME = "dwhteytc2"; // from Cloudinary dashboard
const UPLOAD_PRESET = "nasrullah_unsigned";

export default function ProfileScreen({ route, navigation }) {
  const auth = getAuth();
  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log("✅ User signed out");
      navigation.replace("Login"); // make sure "Login" is one of your routes
    } catch (error) {
      console.error("❌ Error signing out:", error);
      Alert.alert("Error", "Could not log out. Try again.");
    }
  };
  const user = auth.currentUser;
  const provider = route.params?.provider;
  const isOwnProfile = !provider;
  console.log('🧭 Route params:', route.params);

  const [userData, setUserData] = useState({
    name: '',
    phone: '',
    email: '',
    services: [],
    profileImage: null,
    id: null,
  });
  const [newService, setNewService] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [serviceLoading, setServiceLoading] = useState({});

  const fetchUserData = useCallback(async () => {
    if (!user) return;
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserData({
          name: data.name || user.displayName || '',
          phone: data.phone || '',
          email: data.email || user.email || '',
          services: data.services || [],
          profileImage: data.profileImage || null,
          id: user.uid,
        });
      } else {
        console.log('No user document found, initializing with defaults');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      Alert.alert('Error', 'Failed to load profile data.');
    }
  }, [user]);

  useEffect(() => {
    if (isOwnProfile && user) {
      fetchUserData();
    } else if (provider) {
      setUserData({
        name: provider.name || '',
        phone: provider.phone || '',
        email: provider.email || '',
        services: provider.services || [],
        profileImage: provider.profileImage || null,
        id: provider.id,
      });
    }
  }, [user, provider, fetchUserData]);

  const pickImage = useCallback(async () => {
  const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permissionResult.granted) {
    Alert.alert('Permission Denied', 'Please allow access to photos.');
    return;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });

  if (!result.canceled && result.assets?.length > 0) {
    setImageLoading(true);
    try {
      const imageUri = result.assets[0].uri;

      let data = new FormData();
      data.append("file", {
        uri: imageUri,
        type: "image/jpeg",
        name: `profile_${user.uid}.jpg`,
      });
      data.append("upload_preset", UPLOAD_PRESET);

      let res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: data,
      });

      let resultData = await res.json();
      if (resultData.secure_url) {
        // ✅ Save Cloudinary URL in state (and later in Firestore)
        setUserData(prev => ({ ...prev, profileImage: resultData.secure_url }));
      } else {
        Alert.alert("Upload Failed", "Could not upload image to Cloudinary");
      }
    } catch (error) {
      console.error("Error uploading to Cloudinary:", error);
      Alert.alert("Error", "Failed to upload image.");
    } finally {
      setImageLoading(false);
    }
  }
  }, [user]);

  const addService = useCallback(() => {
    if (!newService.trim()) return;
    setUserData(prev => ({
      ...prev,
      services: [...prev.services, newService.trim()],
    }));
    setNewService('');
  }, [newService]);

  const removeService = useCallback((index) => {
    setUserData(prev => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== index),
    }));
  }, []);

  const saveProfile = useCallback(async () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to save changes.');
      return;
    }
    if (!userData.name.trim() || !userData.email.trim()) {
      Alert.alert('Error', 'Name and email are required.');
      return;
    }
    setLoading(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        id: user.uid,
        name: userData.name.trim(),
        phone: userData.phone.trim(),
        email: userData.email.trim(),
        services: userData.services,
        profileImage: userData.profileImage || null,
        profileViews: userData.profileViews || 0,
        contactsReceived: userData.contactsReceived || 0,
        createdAt: userData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      Alert.alert('Success', 'Profile updated successfully.');
      navigation.goBack();
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile changes.');
    } finally {
      setLoading(false);
    }
  }, [user, userData, navigation]);

  const handleRequestService = useCallback(async (service) => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to request a service.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
      return;
    }
    if (!provider?.id) {
      Alert.alert('Error', 'Provider ID is missing.');
      return;
    }
    setServiceLoading(prev => ({ ...prev, [service]: true }));
    try {
      const notificationId = `${provider.id}_${user.uid}_${service}_${Date.now()}`;
      await setDoc(doc(db, 'notifications', notificationId), {
        toUserId: provider.id,
        fromUserId: user.uid,
        fromUserName: user.displayName || 'Anonymous',
        fromUserPhone: userData.phone || '',
        message: `I need ${service} service`,
        read: false,
        timestamp: new Date().toISOString(),
        type: 'service_request',
        service,
      });
      await setDoc(doc(db, 'users', provider.id), { contactsReceived: increment(1) }, { merge: true });
      console.log('📩 Sent service request for:', service, 'to:', provider.id);
      Alert.alert('Success', `Request for ${service} sent to ${provider.name}!`);
    } catch (error) {
      console.error('Error sending service request:', error);
      Alert.alert('Error', 'Failed to send service request.');
    } finally {
      setServiceLoading(prev => ({ ...prev, [service]: false }));
    }
  }, [user, provider, userData.phone, navigation]);

  const CustomIcon = useCallback(({ name, size = 24, color = '#666' }) => {
    console.log(`🎨 Rendering icon: ${name}`);
    return <MaterialCommunityIcons name={name} size={size} color={color} />;
  }, []);

  if (!user && isOwnProfile) {
    return (
      <View style={styles.centered}>
        <Paragraph>Please sign in to view your profile.</Paragraph>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Card style={styles.card} elevation={4}>
        <Card.Content>
          <Title style={styles.title}>
            {isOwnProfile ? 'Edit Profile' : `${userData.name}'s Profile`}
          </Title>
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: userData.profileImage || 'https://via.placeholder.com/150' }}
              style={styles.profileImage}
            />
            {isOwnProfile && (
              <TouchableOpacity style={styles.imageButton} onPress={pickImage} disabled={imageLoading}>
                <CustomIcon name="camera" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            )}
            {imageLoading && (
              <ActivityIndicator size="small" style={styles.imageLoading} theme={{ colors: { primary: '#2E7D32' } }} />
            )}
          </View>
          {isOwnProfile ? (
            <TextInput
              label="Name"
              value={userData.name}
              onChangeText={(text) => setUserData(prev => ({ ...prev, name: text }))}
              style={styles.input}
              mode="outlined"
              theme={{ colors: { primary: '#2E7D32' } }}
              error={!userData.name.trim()}
            />
          ) : (
            <Paragraph style={styles.fieldText}>Name: {userData.name}</Paragraph>
          )}
          {isOwnProfile ? (
            <TextInput
              label="Email"
              value={userData.email}
              onChangeText={(text) => setUserData(prev => ({ ...prev, email: text }))}
              style={styles.input}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              theme={{ colors: { primary: '#2E7D32' } }}
              error={!userData.email.trim()}
            />
          ) : (
            <Paragraph style={styles.fieldText}>Email: {userData.email || 'Not provided'}</Paragraph>
          )}
          {isOwnProfile ? (
            <TextInput
              label="Phone"
              value={userData.phone}
              onChangeText={(text) => setUserData(prev => ({ ...prev, phone: text }))}
              style={styles.input}
              mode="outlined"
              keyboardType="phone-pad"
              theme={{ colors: { primary: '#2E7D32' } }}
            />
          ) : (
            <Paragraph style={styles.fieldText}>Phone: {userData.phone || 'Not provided'}</Paragraph>
          )}
          {isOwnProfile && (
            <View style={styles.servicesContainer}>
              <TextInput
                label="Add Service"
                value={newService}
                onChangeText={setNewService}
                style={styles.input}
                mode="outlined"
                theme={{ colors: { primary: '#2E7D32' } }}
                onSubmitEditing={addService}
                returnKeyType="done"
              />
              <Button
                mode="contained"
                onPress={addService}
                style={styles.addButton}
                theme={{ colors: { primary: '#2E7D32' } }}
                disabled={!newService.trim()}
              >
                Add Service
              </Button>
            </View>
          )}
          {userData.services.length > 0 && (
            <View style={styles.servicesList}>
              <Paragraph style={styles.sectionTitle}>Services</Paragraph>
              {userData.services.map((service, index) => (
                <View key={`${service}-${index}`} style={styles.serviceItem}>
                  <Paragraph style={styles.serviceText}>
                    {service.charAt(0).toUpperCase() + service.slice(1)}
                  </Paragraph>
                  {isOwnProfile ? (
                    <TouchableOpacity onPress={() => removeService(index)}>
                      <CustomIcon name="delete" size={24} color="#D32F2F" />
                    </TouchableOpacity>
                  ) : (
                    <Button
                      mode="contained"
                      onPress={() => handleRequestService(service)}
                      loading={serviceLoading[service]}
                      disabled={serviceLoading[service]}
                      style={styles.requestButton}
                      theme={{ colors: { primary: '#2E7D32' } }}
                    >
                      Request {service}
                    </Button>
                  )}
                </View>
              ))}
            </View>
          )}
          {isOwnProfile && (
            <Button
              mode="contained"
              onPress={saveProfile}
              style={styles.saveButton}
              theme={{ colors: { primary: '#2E7D32' } }}
              disabled={loading || !userData.name.trim() || !userData.email.trim()}
              loading={loading}
            >
              Save Changes
            </Button>
          )}
          {isOwnProfile && (
      <Button
        mode="outlined"
        onPress={handleLogout}
        style={styles.logoutButton}
        labelStyle={{ color: '#D32F2F', fontWeight: 'bold' }}
      >
        Log Out
      </Button>
    )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    padding: 16,
  },
  contentContainer: {
    paddingBottom: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#E5E5E5',
  },
  imageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#2E7D32',
    borderRadius: 20,
    padding: 8,
  },
  imageLoading: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  fieldText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
  },
  servicesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  addButton: {
    marginLeft: 8,
    borderRadius: 8,
  },
  servicesList: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  serviceText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  saveButton: {
    marginTop: 8,
    borderRadius: 8,
  },
  requestButton: {
    borderRadius: 8,
    minWidth: 120,
  },
  logoutButton: {
  marginTop: 12,
  borderRadius: 8,
  borderColor: '#D32F2F',
},
});