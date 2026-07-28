import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function BookingSuccessModal() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Extract variables securely forwarded from the calendar route handler
  const { date, time, price } = params;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Success Visual Indicator Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.iconText}>✓</Text>
        </View>

        <Text style={styles.title}>Booking Confirmed!</Text>
        <Text style={styles.subtitle}>Your appointment parameters have been successfully secured.</Text>

        {/* Clear Itemized Receipt Layout Breakdown */}
        <View style={styles.receipt}>
          <View style={styles.row}>
            <Text style={styles.label}>Scheduled Date:</Text>
            <Text style={styles.value}>{date || 'N/A'}</Text>
          </View>
          
          <View style={styles.row}>
            <Text style={styles.label}>Reserved Time:</Text>
            <Text style={styles.value}>{time || 'N/A'}</Text>
          </View>

          <View style={[styles.row, styles.totalRow]}>
            <Text style={styles.totalLabel}>Amount Charge Paid:</Text>
            <Text style={styles.totalValue}>
              ${price ? parseFloat(price as string).toFixed(2) : '0.00'}
            </Text>
          </View>
        </View>

        {/* Dismiss Trigger Navigation Control */}
        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Return to Main View</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)', // Dimmed backdrop color scheme
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 420,
    padding: 24,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 6 },
      web: { boxShadow: '0 10px 25px rgba(0,0,0,0.08)' }
    }),
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e6f4ea',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconText: {
    color: '#137333',
    fontSize: 24,
    fontWeight: 'bold',
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
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  receipt: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: '#64748b',
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  totalRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
    borderStyle: 'dashed',
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
  button: {
    width: '100%',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
