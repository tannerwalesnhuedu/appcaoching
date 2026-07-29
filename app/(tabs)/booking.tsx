import React, { useEffect, useState } from 'react'; 
import { 
  ActivityIndicator, 
  Alert, 
  FlatList, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View 
} from 'react-native'; 
import { Calendar } from 'react-native-calendars'; 
import { useRouter } from "expo-router"; 
import { supabase } from '../../lib/supabase/index'; 

// 🛡️ Global Styles Sheet object instantiated at top scope
const styles = StyleSheet.create({ 
  container: { flex: 1, padding: 24, backgroundColor: '#f9f9f9', paddingTop: 60 }, 
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' }, 
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }, 
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
  
  segmentContainer: { flexDirection: 'row', backgroundColor: '#e2e8f0', padding: 4, borderRadius: 10, marginBottom: 20 },
  segmentBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  segmentBtnActive: { backgroundColor: '#ffffff' },
  segmentText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  segmentTextActive: { color: '#0f172a' },
  statusBadge: { backgroundColor: '#e6f4ea', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  statusBadgeText: { color: '#137333', fontSize: 12, fontWeight: '700' },

  successCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 24, alignItems: 'center', marginTop: 40, borderWidth: 1, borderColor: '#eee' },
  successIconBubble: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#e6f4ea', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  successIconText: { color: '#137333', fontSize: 24, fontWeight: 'bold' },
  successTitle: { fontSize: 22, fontWeight: '700', color: '#0f172a', marginBottom: 6 },
  successSubtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  receiptContainer: { width: '100%', backgroundColor: '#f8fafc', borderRadius: 12, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#e2e8f0' },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  receiptLabel: { fontSize: 14, color: '#64748b' },
  receiptVal: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  receiptTotalRow: { borderTopWidth: 1, borderTopColor: '#cbd5e1', borderStyle: 'dashed', paddingTop: 12, marginTop: 12 },
  receiptTotalLabel: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  receiptTotalValue: { fontSize: 16, fontWeight: '700', color: '#007AFF' },
  primaryActionBtn: { width: '100%', backgroundColor: '#0f172a', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  primaryActionText: { color: '#ffffff', fontSize: 15, fontWeight: '600' }
});

interface Appointment { 
  id: string; 
  session_date: string; 
  session_time: string; 
  is_booked: boolean; 
  user_id?: string; 
  client_email?: string;
} 

// Stabilized date string parsing structure
const todayString: string = new Date().toISOString().split('T')[0];

export default function BookingScreen(): React.JSX.Element { 
  const [allSlots, setAllSlots] = useState<Appointment[]>([]); 
  const [filteredSlots, setFilteredSlots] = useState<Appointment[]>([]); 
  const [mySchedule, setMySchedule] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(''); 
  
  const [activeTab, setActiveTab] = useState<'book' | 'schedule'>('book'); 
  const [confirmedDetails, setConfirmedDetails] = useState<Appointment | null>(null); 

  const [loading, setLoading] = useState<boolean>(true); 
  const [submitting, setSubmitting] = useState<boolean>(false); 
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true); 
  const router = useRouter(); 

  useEffect(() => { 
    let isMounted: boolean = true; 
    supabase.auth.getSession().then(({ data: { session } }) => { 
      if (!isMounted) return; 
      if (!session) { 
        router.replace("/(tabs)" as any); 
      } else { 
        setCheckingAuth(false); 
        fetchData(isMounted); 
      } 
    }); 
    return () => { isMounted = false; }; 
  }, [activeTab]); 

  async function fetchData(isMounted: boolean): Promise<void> { 
    setLoading(true); 
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (activeTab === 'book') {
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
    } else {
      const { data, error } = await supabase
        .from('appointments')
        .select('id, session_date, session_time, is_booked, user_id')
        .eq('user_id', user.id)
        .order('session_date', { ascending: true });

      if (!isMounted) return;
      if (error) {
        Alert.alert('Error', 'Could not retrieve your schedule history.');
      } else if (data) {
        setMySchedule(data as Appointment[]);
      }
    }
    setLoading(false); 
  } 

  const handleSelectDay = (dateString: string): void => { 
    if (dateString < todayString) return; 
    setSelectedDate(dateString); 
    const dayMatches: Appointment[] = allSlots.filter((slot: Appointment) => slot.session_date === dateString && !slot.is_booked); 
    setFilteredSlots(dayMatches); 
  }; 

     const getMarkedDates = (): Record<string, any> => { 
    const marked: Record<string, any> = {}; 
    
    allSlots.forEach((slot: Appointment) => { 
      if (!slot.is_booked && slot.session_date >= todayString) { 
        // 🌟 INDUSTRY STANDARD: Combines the indicator dot with clear, bold blue text coloring
        marked[slot.session_date] = { 
          marked: true, 
          dotColor: '#007AFF',
          customStyles: {
            text: { 
              color: '#007AFF', 
              fontWeight: '750' 
            }
          }
        }; 
      } 
    }); 
    
    if (selectedDate) { 
      marked[selectedDate] = { 
        ...marked[selectedDate], 
        selected: true, 
        selectedColor: '#007AFF',
        customStyles: {
          text: { 
            color: '#ffffff', // Ensures the text numbers invert cleanly to white when clicked
            fontWeight: '750' 
          }
        }
      }; 
    } 
    return marked; 
  }; 



  async function bookSession(slotId: string, date: string, time: string): Promise<void> { 
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
      setAllSlots((prev: Appointment[]) => prev.filter((slot: Appointment) => slot.id !== slotId)); 
      setFilteredSlots((prev: Appointment[]) => prev.filter((slot: Appointment) => slot.id !== slotId)); 
    } 
    setSubmitting(false); 
  } 

  async function handleSignOut(): Promise<void> { 
    await supabase.auth.signOut(); 
    router.replace("/(tabs)" as any); 
  } 

  if (checkingAuth || loading) { 
    return ( 
      <View style={styles.center}> 
        <ActivityIndicator size="large" color="#007AFF" /> 
        <Text style={styles.loadingText}>Loading engine services securely...</Text> 
      </View> 
    ); 
  } 

  if (confirmedDetails) {
    return (
      <View style={styles.container}>
        <View style={styles.successCard}>
          <View style={styles.successIconBubble}>
            <Text style={styles.successIconText}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Reservation Confirmed!</Text>
          <Text style={styles.successSubtitle}>Your session parameter records have been successfully added to production.</Text>

          <View style={styles.receiptContainer}>
            <View style={styles.receiptRow}><Text style={styles.receiptLabel}>Selected Date:</Text><Text style={styles.receiptVal}>{confirmedDetails.session_date}</Text></View>
            <View style={styles.receiptRow}><Text style={styles.receiptLabel}>Time Window:</Text><Text style={styles.receiptVal}>{confirmedDetails.session_time}</Text></View>
            <View style={[styles.receiptRow, styles.receiptTotalRow]}>
              <Text style={styles.receiptTotalLabel}>Amount Charged:</Text>
              <Text style={styles.receiptTotalValue}>$150.00</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.primaryActionBtn} onPress={() => { setConfirmedDetails(null); setSelectedDate(''); } }>
            <Text style={styles.primaryActionText}>Return to Booking Interface</Text>
           </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Dashboard</Text>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.segmentContainer}>
        <TouchableOpacity 
          style={[styles.segmentBtn, activeTab === 'book' && styles.segmentBtnActive]} 
          onPress={() => setActiveTab('book')}
        >
          <Text style={[styles.segmentText, activeTab === 'book' && styles.segmentTextActive]}>Book Session</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.segmentBtn, activeTab === 'schedule' && styles.segmentBtnActive]} 
          onPress={() => setActiveTab('schedule')}
        >
          <Text style={[styles.segmentText, activeTab === 'schedule' && styles.segmentTextActive]}>My Schedule</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'book' ? (
        <View style={{ flex: 1 }}>
          <Text style={styles.subHeader}>Select an active date square to view open available options.</Text> 
          <View style={styles.calendarWrapper}> 
         <Calendar 
  minDate={todayString} 
  disableAllTouchEventsForDisabledDays={true}
  markingType={'custom'} // 🌟 CRITICAL FLAG: Turns on the styling overrides for text colors
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
                <Text style={styles.noSlotsText}>No openings listed on this specific day.</Text> 
              ) : (
                <FlatList 
                  data={filteredSlots} 
                  keyExtractor={(item: Appointment) => item.id} 
                  renderItem={({ item }: { item: Appointment }) => ( 
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
            <Text style={styles.promptText}>Tap an active calendar date square to review options.</Text> 
          )} 
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>Your Confirmed Appointments:</Text>
          {mySchedule.length === 0 ? (
            <Text style={styles.noSlotsText}>You have no reserved time slots scheduled.</Text>
          ) : (
            <FlatList
              data={mySchedule}
              keyExtractor={(item: Appointment) => item.id}
              renderItem={({ item }: { item: Appointment }) => (
                <View style={styles.slotCard}>
                  <View>
                    <Text style={styles.dateText}>{item.session_date}</Text>
                    <Text style={styles.timeText}>{item.session_time}</Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>Secured</Text>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      )}
    </View> 
  )}; 
