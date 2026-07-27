import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  Pressable, 
  ActivityIndicator, 
  Platform,
  Alert 
} from 'react-native';
import { useRouter } from 'expo-router';

// Define the clear, typed input properties for our state container
interface BookingState {
  service_name: string;
  session_date: string;
  session_time: string;
  price: number;
  client_email: string;
}

export default function BookingScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);
  const [formData, setFormData] = useState<BookingState>({
    service_name: 'Premium Life Coaching',
    session_date: '',
    session_time: '',
    price: 150.00,
    client_email: ''
  });

  // Calculate the minimum string value needed to disable past calendar dates
  const getTodayString = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`; // Outputs precisely: YYYY-MM-DD
  };

  const handleBookingSubmit = async () => {
    // Structural client-side input string validation
    if (!formData.session_date || !formData.session_time || !formData.client_email) {
      displayNotification('Error', 'Please fill out all required form fields.');
      return;
    }

    // Secondary local safety check targeting tampered date configurations
    const targetDate = new Date(`${formData.session_date}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (targetDate < today) {
      displayNotification('Invalid Date', 'Selected booking date cannot be in the past.');
      return;
    }

    setLoading(true);
    try {
      // Connects cleanly to your Supabase/Vercel hosted application routing logic
      const response = await fetch('https://vercel.app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success && result.id) {
        // Expo Router clean screen navigation transition passing our primary secure key
        router.push({
          pathname: '/modal', // Routes cleanly to your configured confirmation modal
          params: { token: result.id, date: formData.session_date, time: formData.session_time, price: formData.price }
        });
      } else {
        displayNotification('Booking Failed', result.error || 'Check fields and try again.');
      }
    } catch (err: any) {
      displayNotification('Network Error', 'Connection failed. Check server endpoints.');
    } finally {
      setLoading(false);
    }
  };

  // Safe wrapper handling cross-platform error text rendering cleanly across OS layers
  const displayNotification = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Schedule Appointment</Text>
        <Text style={styles.subtitle}>Select your preferred date, session hour, and complete registry layout.</Text>

        {/* Read-Only Service Component Block */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Selected Program</Text>
          <TextInput 
            style={[styles.input, styles.disabledInput]} 
            value={formData.service_name} 
            editable={false} 
          />
        </View>

        {/* Date and Time Layout Input Row */}
        <View style={styles.row}>
          <View style={styles.flex1}>
            <Text style={styles.label}>Date</Text>
            <TextInput 
              style={styles.input}
              placeholder="YYYY-MM-DD"
              // Web native fallback handles calendar restriction directly
              {...(Platform.OS === 'web' ? { min: getTodayString() } : {})}
              onChangeText={(text) => setFormData({ ...formData, session_date: text })}
              value={formData.session_date}
            />
          </View>
          <View style={styles.flex1}>
            <Text style={styles.label}>Time Slot</Text>
            <TextInput 
              style={styles.input}
              placeholder="10:00 AM"
              onChangeText={(text) => setFormData({ ...formData, session_time: text })}
              value={formData.session_time}
            />
          </View>
        </View>

        {/* Email Identification Block */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput 
            style={styles.input}
            placeholder="name@domain.com"
            keyboardType="email-address"
            autoCapitalize="none"
            onChangeText={(text) => setFormData({ ...formData, client_email: text })}
            value={formData.client_email}
          />
        </View>

        {/* Metric Price Verification Card Footer */}
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Total Rate Due:</Text>
          <Text style={styles.priceValue}>${formData.price.toFixed(2)}</Text>
        </View>

        {/* Native Interactive Form Submission Control */}
        <Pressable 
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, loading && styles.buttonDisabled]}
          onPress={handleBookingSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Confirm Booking Window</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 24,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  flex1: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    fontSize: 15,
    color: '#0f172a',
  },
  disabledInput: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
    color: '#64748b',
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginBottom: 24,
  },
  priceLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  priceValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    backgroundColor: '#94a3b8',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
