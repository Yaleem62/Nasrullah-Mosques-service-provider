import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Button, Title, Subheading } from 'react-native-paper';

export default function LandingScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Image 
          source={require('../../assets/logo.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <Title style={styles.title}>Nasrullah Masjid</Title>
        <Subheading style={styles.subtitle}>
          Connect with service providers within the mosque
        </Subheading>
      </View>
      
      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('Login')}
          style={[styles.button, styles.containedButton]}
          labelStyle={styles.buttonLabelContained}
        >
          Login
        </Button>
        <Button
          mode="outlined"
          onPress={() => navigation.navigate('Signup')}
          style={[styles.button, styles.outlinedButton]}
          labelStyle={styles.buttonLabelOutlined}
        >
          Sign Up
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2E7D32',
    justifyContent: 'space-between',
    padding: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#E8F5E8',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  buttonContainer: {
    marginBottom: 40,
  },
  button: {
    marginVertical: 8,
    paddingVertical: 8,
    borderRadius: 8,
    width: '100%',
  },
  containedButton: {
    backgroundColor: '#FFFFFF',
  },
  outlinedButton: {
    borderColor: '#FFFFFF',
    borderWidth: 2,
  },
  buttonLabelContained: {
    color: '#2E7D32',
    fontWeight: 'bold',
    fontSize: 16,
  },
  buttonLabelOutlined: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
