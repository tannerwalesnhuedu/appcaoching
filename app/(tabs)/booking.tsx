import React, { useEffect, useState } from 'react'; 
import { 
  ActivityIndicator, 
  Alert, 
  FlatList, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View,
  Modal,
  Platform
} from 'react-native'; 
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

const todayString = new Date().toISOString().split('T')[0];

export default function BookingScreen() { 
  const [allSlots, setAllSlots] = useState<Appointment[]>([]); 
  const [filteredSlots, setFilteredSlots] = useState<Appointment[]>([]); 
  const [selectedDate, setSelectedDate] = useState<string>(''); 
  const [loading, setLoading] = useState(true); 
  const [submitting, setSubmitting] = useState(false); 
  const [checkingAuth, setCheckingAuth] = useState(true); 
  
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [confirmedDetails, setConfirmedDetails] = useState<Appointment | null>(null);

  const router = useRouter(); 

  useEffect(() => { 
    let isMounted = true; 
    supabase.auth.getSession().then(({ data: { session } }) => { 
      if (!isMounted) return; 
      if (!session) { 
        router.replace("/(tabs)" as any); 
      } else { 
        setCheckingAuth(false); 
        fetchAvailableOpenings(isMounted); 
      } 
    }); 
    return () => { isMounted = false; }; 
  }, []); 

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
    if (dateString < todayString) return;
    setSelectedDate(dateString); 
    const dayMatches = allSlots.filter((slot: Appointment) => slot.session_date === dateString && !slot.is_booked); 
    setFilteredSlots(dayMatches); 
  }; 

  const getMarkedDates = () => { 
    const marked: any = {}; 
    allSlots.forEach((slot) => { 
      if (!slot.is_booked && slot.session_date >= todayString) { 
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
    
    const { data: success, error } = await supabase.rpc('secure_reserve_appointment', {
      target_slot_id: slotId,
      target_user_id: user.id,
      target_user_email: user.email
    });

    if (error || !success) { 
      Alert.alert('Booking Conflict', 'This specific session window was just claimed by another browser thread.'); 
    } else { 
      setConfirmedDetails({ id: slotId, session_date: date, session_time: time, is_booked: true });
      setShowSuccessModal(true); 
      
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
      <View style={styles.headerRow}> 
        <Text style={styles.header}>Book a Session</Text> 
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}> 
          <Text style={styles.signOutText}>Sign Out</Text> 
        </TouchableOpacity> 
      </View> 
      
      <Text style={styles.subHeader}>Select an active date square to review open time allocations.</Text> 
      
      <View style={styles.calendarWrapper}> 
        <Calendar 
          minDate={todayString} 
          disableAllTouchEventsForDisabledDays={true}
          onDayPress={(day) => handleSelectDay(day.dateString)} 
          markedDates={getMarkedDates()} 
          theme={{ 
            todayTextColor: '#007AFF', 
            selectedDayBackgroundColor: '#007AFF', 
            arrowColor: '#007AFF',
            textDisabledColor: '#d9e1e8'
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

      <Modal
        animationType="fade"
        transparent={true}
        visible={showSuccessModal}
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.successIconBubble}>
              <Text style={styles.successIconText}>✓</Text>
            </View>
            <Text style={styles.modalTitle}>Booking Confirmed!</Text>
            <Text style={styles.modalSubtitle}>Your appointment window has been securely locked into production.</Text>
            
            <View style={styles.receiptContainer}>
              <View style={styles.receiptRow}><Text style={styles.receiptLabel}>Date:</Text><Text style={styles.receiptVal}>{confirmedDetails?.session_date}</Text></View>
              <View style={styles.receiptRow}><Text style={styles.receiptLabel}>Time:</Text><Text style={styles.receiptVal}>{confirmedDetails?.session_time}</Text></View>
              <View style={[styles.receiptRow, styles.receiptTotalRow]}>
                <Text style={styles.receiptTotalLabel}>Amount Paid:</Text>
                <Text style={styles.receiptTotalValue}>$150.00</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeOverlayBtn} onPress={() => setShowSuccessModal(false)}>
              <Text style={styles.closeOverlayText}>Acknowledge & Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { backgroundColor: '#fff', borderRadius: 16, width: '100%', maxWidth: 380, padding: 24, alignItems: 'center' },
  successIconBubble: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#e6f4ea', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  successIconText: { color: '#137333', fontSize: 24, fontWeight: 'bold' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#111', marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: '#555', textAlign: 'center', marginBottom: 20 },
  
  receiptContainer: { width: '100%', borderTopWidth: 1, borderColor: '#eee', paddingTop: 12, marginBottom: 20 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  receiptLabel: { fontSize: 14, color: '#444' },
  receiptVal: { fontSize: 14, color: '#222', fontWeight: '600' },
  
  receiptTotalRow: { borderTopWidth: 1, borderColor: '#eee', paddingTop: 8, marginTop: 8 },
  receiptTotalLabel: { fontSize: 15, color: '#111', fontWeight: '700' },
  receiptTotalValue: { fontSize: 15, color: '#111', fontWeight: '700' },

  closeOverlayBtn: { backgroundColor: '#007AFF', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  closeOverlayText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
});