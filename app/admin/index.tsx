import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { supabase } from '../../lib/supabase';

export default function StandardAdminPanel(): React.JSX.Element {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const router = useRouter();

  // Handle system calendar responses
  const onDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS !== 'ios') setShowDatePicker(false);
    if (date) setSelectedDate(date);
  };

  const onTimeChange = (event: DateTimePickerEvent, time?: Date) => {
    if (Platform.OS !== 'ios') setShowTimePicker(false);
    if (time) setSelectedTime(time);
  };

  const handlePublishSlot = async (): Promise<void> => {
    setSubmitting(true);
    try {
      // 💡 THE INDUSTRY STANDARD CONVERSION: 
      // Extract components cleanly out of native Date objects to construct a bulletproof UTC ISO layout
      const datePart = selectedDate.toISOString().split('T')[0]; // "YYYY-MM-DD"
      const timePart = selectedTime.toISOString().split('T')[1]; // "HH:MM:SS..."

      const standardizedUtcIsoPayload = new Date(`${datePart}T${timePart}`).toISOString();

      const { error } = await supabase
        .from('appointments')
        .insert({
          session_timestamp: standardizedUtcIsoPayload,
          is_booked: false,
          price: 150
        });

      if (error) throw error;

      Alert.alert('Success', 'Standardized slot published to active grid!');
    } catch (err: any) {
      console.error(err);
      Alert.alert('Write Failure', err.message || 'Check network connection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)' as any)}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Slot Management Engine</Text>
      </View>

      {/* Target Selector Action Triggers */}
      <Text style={styles.inputLabel}>Target Appointment Date:</Text>
      <TouchableOpacity style={styles.pickerSelectorBox} onPress={() => setShowDatePicker(true)}>
        <Ionicons name="calendar-outline" size={20} color="#475569" />
        <Text style={styles.pickerText}>{selectedDate.toLocaleDateString()}</Text>
      </TouchableOpacity>

      <Text style={styles.inputLabel}>Target Start Time Window:</Text>
      <TouchableOpacity style={styles.pickerSelectorBox} onPress={() => setShowTimePicker(true)}>
        <Ionicons name="time-outline" size={20} color="#475569" />
        <Text style={styles.pickerText}>{selectedTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text>
      </TouchableOpacity>

      {/* System Popup Modules conditional hooks */}
      {showDatePicker && (
        <DateTimePicker value={selectedDate} mode="date" display="default" minimumDate={new Date()} onChange={onDateChange} />
      )}
      {showTimePicker && (
        <DateTimePicker value={selectedTime} mode="time" display="default" is24Hour={false} onChange={onTimeChange} />
      )}

      <TouchableOpacity style={styles.submitBtn} disabled={submitting} onPress={handlePublishSlot}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Publish to Live Grid</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', paddingHorizontal: 24, paddingTop: 50 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 32, gap: 12 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#111' },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8 },
  pickerSelectorBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 14, marginBottom: 20 },
  pickerText: { fontSize: 16, color: '#1e293b', fontWeight: '500' },
  submitBtn: { backgroundColor: '#007AFF', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
