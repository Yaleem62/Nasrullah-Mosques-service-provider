import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Title, Text, Button, Chip, TextInput, Card, ActivityIndicator } from 'react-native-paper';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../hooks/useAuth';
import { servicesList } from '../utils/serviceList';
import { MaterialCommunityIcons } from '@expo/vector-icons'; // Added for CustomIcon

export default function EditServicesScreen() {
  const { user } = useAuth();
  const [userServices, setUserServices] = useState([]);
  const [customService, setCustomService] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Listen to real-time updates of user's services
    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setUserServices(data.services || []);
        } else {
          setUserServices([]); // No doc yet, start empty
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error loading services:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const updateServices = async (newServices) => {
    if (!user) {
      console.warn('No authenticated user.');
      return;
    }

    console.log('Updating services to:', newServices);
    setUpdating(true);
    try {
      await setDoc(
        doc(db, 'users', user.uid),
        {
          services: newServices,
          updatedAt: new Date(),
        },
        { merge: true } // Merge with existing data
      );
      console.log('Services updated successfully');
    } catch (error) {
      console.error('Error updating services:', error);
      Alert.alert('Error', 'Failed to update services. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const addService = (service) => {
    const serviceKey = service.toLowerCase().trim();

    // Check if already exists
    if (userServices.includes(serviceKey)) {
      Alert.alert('Notice', 'This service is already in your list');
      return;
    }

    // Check max limit of 3 services
    if (userServices.length >= 3) {
      Alert.alert('Limit Reached', 'You can only offer up to 3 services');
      return;
    }

    const newServices = [...userServices, serviceKey];
    updateServices(newServices);
  };

  const removeService = (service) => {
    const newServices = userServices.filter(s => s !== service);
    updateServices(newServices);
  };

  const addCustomService = () => {
    if (!customService.trim()) {
      Alert.alert('Invalid Input', 'Please enter a service name');
      return;
    }

    if (customService.trim().length < 2) {
      Alert.alert('Invalid Input', 'Service name must be at least 2 characters');
      return;
    }

    addService(customService.trim());
    setCustomService('');
  };

  // Custom Icon component for consistent rendering
  const CustomIcon = ({ name, size = 24, color = '#666', ...props }) => {
    console.log(`🎨 Rendering icon: ${name}`);
    return <MaterialCommunityIcons name={name} size={size} color={color} {...props} />;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading your services...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Current Services */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Your Services ({userServices.length}/3)</Title>
          {userServices.length > 0 ? (
            <View style={styles.servicesContainer}>
              {userServices.map((service, index) => (
                <Chip
                  key={index}
                  onClose={() => removeService(service)}
                  closeIcon={() => <CustomIcon name="close" />}
                  style={styles.userServiceChip}
                  textStyle={styles.userChipText}
                >
                  {service.charAt(0).toUpperCase() + service.slice(1)}
                </Chip>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>
              You haven't added any services yet. Add up to 3 services below.
            </Text>
          )}
        </Card.Content>
      </Card>

      {/* Add Custom Service */}
      {userServices.length < 3 && (
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Add Custom Service</Title>
            <TextInput
              label="Service Name"
              value={customService}
              onChangeText={setCustomService}
              mode="outlined"
              style={styles.input}
              placeholder="e.g., Web Design, Home Repairs"
            />
            <Button
              mode="contained"
              onPress={addCustomService}
              disabled={!customService.trim() || updating}
              style={styles.addButton}
            >
              Add Service
            </Button>
          </Card.Content>
        </Card>
      )}

      {/* Available Services */}
      {userServices.length < 3 && (
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Choose from Available Services</Title>
            <View style={styles.availableServicesContainer}>
              {servicesList
                .filter(service => !userServices.includes(service.toLowerCase()))
                .map((service, index) => (
                  <Chip
                    key={index}
                    onPress={() => addService(service)}
                    style={styles.availableServiceChip}
                    textStyle={styles.availableChipText}
                  >
                    {service.charAt(0).toUpperCase() + service.slice(1)}
                  </Chip>
                ))}
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Instructions */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Instructions</Title>
          <Text style={styles.instructionText}>
            • You can offer up to 3 services{'\n'}
            • Services help others find you through search{'\n'}
            • Choose specific services that you actually provide{'\n'}
            • You can add custom services not listed above{'\n'}
            • Tap the × on your services to remove them
          </Text>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    paddingTop: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#757575',
  },
  card: {
    margin: 15,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 15,
  },
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  userServiceChip: {
    margin: 4,
    backgroundColor: '#2E7D32',
  },
  userChipText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  availableServicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  availableServiceChip: {
    margin: 4,
    backgroundColor: '#E8F5E8',
  },
  availableChipText: {
    color: '#2E7D32',
  },
  emptyText: {
    fontStyle: 'italic',
    color: '#757575',
    textAlign: 'center',
    paddingVertical: 20,
  },
  input: {
    marginBottom: 15,
  },
  addButton: {
    paddingVertical: 4,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
});