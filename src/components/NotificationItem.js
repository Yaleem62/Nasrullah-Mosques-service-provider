import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Title, Chip } from 'react-native-paper';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

export default function NotificationItem({ notification, onPress }) {
  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card 
      style={[
        styles.card, 
        !notification.read && styles.unreadCard
      ]} 
      onPress={onPress}
    >
      <Card.Content>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {!notification.read && <View style={styles.unreadIndicator} />}
            <Title style={styles.title}>New Service Inquiry</Title>
          </View>
          <Text style={styles.timestamp}>
            {formatTimestamp(notification.timestamp)}
          </Text>
        </View>
        
        <Text style={styles.message}>{notification.message}</Text>
        
        {notification.service && (
          <Chip style={styles.serviceChip} textStyle={styles.serviceChipText}>
            Service: {notification.service}
          </Chip>
        )}
        
        <View style={styles.contactInfo}>
          <View style={styles.contactItem}>
            <MaterialIcons name="person" size={16} color="#757575" />
            <Text style={styles.contactText}>{notification.fromUserName}</Text>
          </View>
          
          {notification.fromUserPhone && (
            <View style={styles.contactItem}>
              <MaterialIcons name="phone" size={16} color="#757575" />
              <Text style={styles.contactText}>{notification.fromUserPhone}</Text>
            </View>
          )}
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 6,
    marginHorizontal: 10,
    elevation: 2,
    backgroundColor: '#FFFFFF',
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#2E7D32',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B6B',
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
    color: '#757575',
  },
  message: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  serviceChip: {
    alignSelf: 'flex-start',
    marginBottom: 12,
    backgroundColor: '#E8F5E8',
  },
  serviceChipText: {
    color: '#2E7D32',
    fontSize: 12,
  },
  contactInfo: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  contactText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
});
