import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { Title, Paragraph, Card, Button } from 'react-native-paper';
import { getAuth } from 'firebase/auth';
import { doc, setDoc, increment } from 'firebase/firestore';
import { db } from '../../firebase';

export default function ProviderProfileScreen({ route, navigation }) {
  const { provider } = route.params;
  const auth = getAuth();
  const user = auth.currentUser;
  const [requestLoading, setRequestLoading] = useState(false);

  const handleRequestService = async (service) => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to request a service.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
      return;
    }

    setRequestLoading(true);
    try {
      // Create notification in the notifications collection
      const notificationId = `${provider.id}_${Date.now()}`;
      await setDoc(doc(db, 'notifications', notificationId), {
        toUserId: provider.id,
        fromUserId: user.uid,
        fromUserName: user.displayName || 'Anonymous',
        message: `I need ${service} service`,
        read: false,
        timestamp: new Date().toISOString(),
        type: 'service_request',
        service,
      });

      // Increment contactsReceived for provider
      await setDoc(
        doc(db, 'users', provider.id),
        { contactsReceived: increment(1) },
        { merge: true }
      );

      Alert.alert('Success', `Request for ${service} sent to ${provider.name}!`);
    } catch (error) {
      console.error('Error sending service request:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
      });
      Alert.alert('Error', 'Failed to send service request.');
    } finally {
      setRequestLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card} elevation={4}>
        <Card.Content>
          <Title style={styles.title}>{provider.name}'s Profile</Title>
          <Paragraph style={styles.email}>{provider.email || 'No email provided'}</Paragraph>
          <Paragraph style={styles.phone}>{provider.phone || 'No phone provided'}</Paragraph>

          {/* Services */}
          {provider.services && provider.services.length > 0 ? (
            <View style={styles.servicesList}>
              <Paragraph style={styles.sectionTitle}>Services</Paragraph>
              {provider.services.map((service, index) => (
                <View key={index} style={styles.serviceItem}>
                  <Paragraph style={styles.serviceText}>
                    {service.charAt(0).toUpperCase() + service.slice(1)}
                  </Paragraph>
                  <Button
                    mode="contained"
                    onPress={() => handleRequestService(service)}
                    loading={requestLoading}
                    disabled={requestLoading}
                    style={styles.requestButton}
                    theme={{ colors: { primary: '#2E7D32' } }}
                  >
                    Request {service}
                  </Button>
                </View>
              ))}
            </View>
          ) : (
            <Paragraph style={styles.noServicesText}>No services listed</Paragraph>
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
  card: {
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  email: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  phone: {
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
  },
  servicesList: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
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
  },
  requestButton: {
    borderRadius: 8,
  },
  noServicesText: {
    fontStyle: 'italic',
    color: '#999',
    fontSize: 14,
  },
});