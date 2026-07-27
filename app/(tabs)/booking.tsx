import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useRouter } from "expo-router";
import { supabase } from '../../lib/supabase/index';

interface Appointment {
  id: string;
  session_date: string;
  session_time: string;
  is_booked: boolean;
  user_id?: string;
}

export default function BookingScreen() {
  const [allSlots, setAllSlots] = useState<Appointment[]>([]);
  const [filteredSlots, setFilteredSlots] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();
  // Gets today's date in 'YYYY-MM-DD' format matching your database layout
const todayString = new Date().toISOString().split('T')[0];


  // 1. SECURE ROUTE AUTHENTICATION HANDSHAKE
  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      if (!session) {
        // 🔒 Secure Guard: Fallback to the entry login panel
        router.replace("/(tabs)" as any);
      } else {
        setCheckingAuth(false);
        fetchAvailableOpenings(isMounted);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. SECURE DATA FETCH ROUTINE (NAME ALIGNED)
  async function fetchAvailableOpenings(isMounted: boolean = true) {
    setLoading(true);
    const { data, error } = await supabase
      .from('appointments')
      .select('id, session_date, session_time, is_booked, user_id')
      .order('session_time', { ascending: true });

    if (!isMounted) return;

    if (error) {
      Alert.alert('Database Error', 'Could not read available calendar openings.');
    } else if (data) {
      setAllSlots(data as Appointment[]);
      if (selectedDate) {
        setFilteredSlots(
          (data as Appointment[]).filter((slot) => slot.session_date === selectedDate && !slot.is_booked)
        );
      }
    }
    setLoading(false);
  }

  const handleSelectDay = (dateString: string) => {
    setSelectedDate(dateString);
    const dayMatches = allSlots.filter((slot: Appointment) => slot.session_date === dateString && !slot.is_booked);
    setFilteredSlots(dayMatches);
  };

  const getMarkedDates = () => {
    const marked: any = {};
    allSlots.forEach((slot) => {
      if (!slot.is_booked) {
        marked[slot.session_date] = { marked: true, dotColor: '#007AFF' };
      }
    });
    if (selectedDate) {
      marked[selectedDate] = { ...marked[selectedDate], selected: true, selectedColor: '#007AFF' };
    }
    return marked;
  };

 async function bookSession(slotId: string, date: string, time: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Alert.alert('Authentication', 'Session expired. Please sign back in.');
  
  setSubmitting(true);
  const { error } = await supabase
    .from('appointments')
    .update({ 
      is_booked: true, 
      client_email: user.email, 
      user_id: user.id 
    })
    .eq('id', slotId.trim());

  if (error) {
    Alert.alert('Booking Failed', 'This session might have just been reserved by someone else.');
  } else {
    // ⚡ CONVENIENCE LAYER: Instantly drop the row from local view states so it vanishes instantly
    Alert.alert('Success! 🎉', `Your appointment on ${date} at ${time} is secured.`);
    setAllSlots((prev) => prev.filter((slot) => slot.id !== slotId));
    setFilteredSlots((prev) => prev.filter((slot) => slot.id !== slotId));
  }
  setSubmitting(false);
}

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/(tabs)" as any);
  }

  if (checkingAuth || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading booking engine views...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Calendar
  // 🛡️ Blocks selection of any past dates
  minDate={todayString}

  // Your existing properties remain the same below, for example:
  current={'2026-07-26'} 
  onDayPress={(day) => {
    setSelectedDate(day.dateString);
  }}
  markedDates={{
    [selectedDate]: { selected: true, selectedColor: '#2563eb' },
  }}
/>

      <View style={styles.headerRow}>
        <Text style={styles.header}>Book a Session</Text>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.subHeader}>Select a highlighted date below to view available choices.</Text>
      
      <View style={styles.calendarWrapper}>
        <Calendar 
          onDayPress={(day) => handleSelectDay(day.dateString)} 
          markedDates={getMarkedDates()} 
          theme={{ 
            todayTextColor: '#007AFF', 
            selectedDayBackgroundColor: '#007AFF', 
            arrowColor: '#007AFF' 
          }} 
        />
      </View>

      {selectedDate ? (
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>Openings for {selectedDate}:</Text>
          {filteredSlots.length === 0 ? (
            <Text style={styles.noSlotsText}>No sessions listed on this specific day.</Text>
          ) : (
            <FlatList 
              data={filteredSlots} 
              keyExtractor={(item) => item.id} 
              renderItem={({ item }) => (
                <View style={styles.slotCard}>
                  <View>
                    <Text style={styles.dateText}>{item.session_date}</Text>
                    <Text style={styles.timeText}>{item.session_time}</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.bookButton} 
                    disabled={submitting} 
                    onPress={() => bookSession(item.id, item.session_date, item.session_time)}
                  >
                    <Text style={styles.bookButtonText}>Reserve</Text>
                  </TouchableOpacity>
                </View>
              )} 
            />
          )}
        </View>
      ) : (
        <Text style={styles.promptText}>Tap an active calendar date square to get started.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f9f9f9', paddingTop: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  header: { fontSize: 24, fontWeight: 'bold', color: '#111' },
  signOutButton: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, backgroundColor: '#eee' },
  signOutText: { color: '#FF3B30', fontWeight: '600', fontSize: 13 },
  subHeader: { fontSize: 14, color: '#666', marginBottom: 16 },
  calendarWrapper: { backgroundColor: '#fff', borderRadius: 12, padding: 8, marginBottom: 20, borderWidth: 1, borderColor: '#eee' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 12 },
  loadingText: { marginTop: 12, fontSize: 16, color: '#444' },
  promptText: { textAlign: 'center', color: '#888', marginTop: 40, fontSize: 15 },
  noSlotsText: { textAlign: 'center', color: '#999', marginTop: 20, fontSize: 14, fontStyle: 'italic' },
  slotCard: { backgroundColor: '#fff', padding: 18, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, borderWidth: 1, borderColor: '#eee' },
  dateText: { fontSize: 16, fontWeight: '700', color: '#222', marginBottom: 4 },
  timeText: { fontSize: 14, color: '#555', fontWeight: '500' },
  bookButton: { backgroundColor: '#007AFF', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 8 },
  bookButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
});
