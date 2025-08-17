import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Title, Text, Chip } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { doc, setDoc, increment, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';

export default function ServiceCard({ provider, onPress }) {
  const [providerData, setProviderData] = useState({
    ...provider,
    profileViews: provider.profileViews || 0,
    contactsReceived: provider.contactsReceived || 0,
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'users', provider.id), (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        setProviderData(prev => ({
          ...prev,
          profileViews: data.profileViews || 0,
          contactsReceived: data.contactsReceived || 0,
        }));
        console.log('🔄 Updated provider data:', { id: provider.id, ...data });
      }
    }, (error) => {
      console.error('Error listening to provider data:', error);
    });

    return () => unsubscribe();
  }, [provider.id]);

  const handlePress = useCallback(async () => {
    try {
      await setDoc(doc(db, 'users', provider.id), { profileViews: increment(1) }, { merge: true });
      console.log('👁️ Incremented profileViews for:', provider.id);
      onPress(provider);
    } catch (error) {
      console.error('Error incrementing profileViews:', error);
    }
  }, [provider, onPress]);

  return (
    <Card style={styles.card} onPress={handlePress}>
      <TouchableOpacity onPress={handlePress}>
        <Card.Content>
          <View style={styles.header}>
            <Title style={styles.name}>{providerData.name}</Title>
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <MaterialIcons name="visibility" size={16} color="#757575" />
                <Text style={styles.statText}>{providerData.profileViews}</Text>
              </View>
              <View style={styles.statItem}>
                <MaterialIcons name="contact-phone" size={16} color="#757575" />
                <Text style={styles.statText}>{providerData.contactsReceived}</Text>
              </View>
            </View>
          </View>
          <View style={styles.servicesContainer}>
            {providerData.services && providerData.services.length > 0 ? (
              providerData.services.map((service, index) => (
                <Chip key={`${service}-${index}`} style={styles.serviceChip} textStyle={styles.chipText}>
                  {service.charAt(0).toUpperCase() + service.slice(1)}
                </Chip>
              ))
            ) : (
              <Text style={styles.noServicesText}>No services listed</Text>
            )}
          </View>
        </Card.Content>
      </TouchableOpacity>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    elevation: 2,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  statText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#757575',
  },
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  serviceChip: {
    margin: 2,
    backgroundColor: '#E8F5E8',
  },
  chipText: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: '500',
  },
  noServicesText: {
    fontStyle: 'italic',
    color: '#999',
    fontSize: 14,
  },
});