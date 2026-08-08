import React, { useEffect, useState } from 'react'; 
import { 
  // --- PASTE THIS IN PLACE OF LINES 3 THROUGH 10 ---
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal
} from 'react-native'; 
import { Calendar } from 'react-native-calendars'; 
import { useRouter } from "expo-router"; 
import { supabase } from '../../lib/supabase/index'; 
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

export interface Appointment {
  id: string;
  session_timestamp: string; // 💡 Updated to match your new backend column
  is_booked: boolean;
  user_id: string | null;
  price?: number;
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
  // Add this near your other useState hooks at the top of the component
  const [user, setUser] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      fetchData(true);
    }, [activeTab])
  );


   // Hook 1: Handle User Authentication and Routing (Runs once on mount)
  useEffect(() => {
    let isMounted: boolean = true;
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      if (!session) {
        router.replace("/(tabs)" as any);
      } else {
        setCheckingAuth(false);
      }
    });

    return () => { isMounted = false; };
  }, []); // Empty array means this only runs once when the page loads


  // Hook 2: Handle Database Fetching (Runs every time the active tab changes!)
  useEffect(() => {
    let isMounted: boolean = true;
    
    // Only fetch data if the user is authenticated and not loading auth state
    if (!checkingAuth) {
      fetchData(isMounted);
    }

    return () => { isMounted = false; };
  }, [activeTab, checkingAuth]); // Re-runs data fetch instantly whenever you flip tabs

  // Add this right around line 73 (completely independent of your other code)
useEffect(() => {
  const syncUserSession = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      setUser(authUser);
    }
  };
  syncUserSession();
}, [checkingAuth]); // Re-runs safely whenever checkingAuth updates


 async function fetchData(isMounted: boolean): Promise<void> {
  setLoading(true);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  if (activeTab === 'book') {
    const { data, error } = await supabase
      .from('appointments')
      // 💡 Clean backend structure: selecting the unified timestamp
      .select('id, session_timestamp, is_booked, user_id, price') 
      .eq('is_booked', false)
      // 💡 Native chronologic ordering directly from Postgres
      .order('session_timestamp', { ascending: true });

    if (!isMounted) return;

    if (error) {
      Alert.alert('Database Error', 'Could not read available calendar openings.');
    } else if (data) {
      const typedData = data as Appointment[];
      setAllSlots(typedData);
      
      if (selectedDate) {
        setFilteredSlots(
          typedData.filter((slot) => {
            // Converts the UTC timestamp safely to a YYYY-MM-DD string matching your device
            const slotDateStr = new Date(slot.session_timestamp).toISOString().split('T')[0];
            return slotDateStr === selectedDate;
          })
        );
      }
    }
  } else {
    const { data, error } = await supabase
      .from('appointments')
      .select('id, session_timestamp, is_booked, user_id')
      .eq('user_id', user.id)
      .order('session_timestamp', { ascending: true });

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

  const dayMatches: Appointment[] = allSlots.filter((slot: Appointment) => {
    // 💡 Pulls date component out securely to check calendar box matching
    const slotDateStr = new Date(slot.session_timestamp).toISOString().split('T')[0];
    const dateMatches = slotDateStr === dateString;
    return dateMatches && !slot.is_booked;
  });

  if (dayMatches.length === 0) {
    return; 
  }
  setFilteredSlots(dayMatches);
  setSelectedDate(dateString);
};


// Replace 'supabase' with the name of your imported Supabase client instance
// Standard Supabase v2 synchronous user lookup via internal state memory
const currentUserId = (supabase.auth as any).currentSession?.user?.id;
// OR for newer Supabase v2:
// const currentUserId = session?.user?.id; 

const getMarkedDates = (): Record<string, any> => {
  const marked: Record<string, any> = {};

  allSlots.forEach((slot: Appointment) => {
    // 💡 Read the date portion (YYYY-MM-DD) out of the timezone timestamp safely
    const slotDateStr = new Date(slot.session_timestamp).toISOString().split('T')[0];

    if (!slot.is_booked && slotDateStr >= todayString) {
      marked[slotDateStr] = {
        marked: true,
        disabled: false,
        dotColor: '#007AFF',
        customStyles: {
          text: { color: '#007AFF', fontWeight: '750' }
        }
      };
    }
  });

  if (selectedDate && marked[selectedDate]) {
    marked[selectedDate] = {
      ...marked[selectedDate],
      selected: true,
      selectedColor: '#007AFF',
      customStyles: {
        text: { color: '#ffffff', fontWeight: '750' }
      }
    };
  }
  return marked;
};



async function bookSession(slotId: string, item: Appointment): Promise<void> {
  setSubmitting(true);

  const { data: { user } } = await supabase.auth.getUser();
  
  // 💡 FIX: Return early if user is null to satisfy TypeScript safety guards
  if (!user) {
    Alert.alert('Authentication', 'Session expired. Please sign back in.');
    setSubmitting(false);
    return;
  }

  // FRONTEND OVERLAP PROTECTION: Define session length (e.g., 60 minutes)
  const sessionDurationMinutes = 60;
  const requestedStart = new Date(item.session_timestamp);
  const requestedEnd = new Date(requestedStart.getTime() + sessionDurationMinutes * 60000);

  const hasOverlap = mySchedule.some((appointment: Appointment) => {
    try {
      const existingStart = new Date(appointment.session_timestamp);
      const existingEnd = new Date(existingStart.getTime() + sessionDurationMinutes * 60000);
      return requestedStart < existingEnd && requestedEnd > existingStart;
    } catch {
      return false;
    }
  });

  if (hasOverlap) {
    Alert.alert('Scheduling Conflict', 'You already have an appointment scheduled that overlaps with this time window.');
    setSubmitting(false);
    return;
  }

  const { data: success, error: supabaseError } = await supabase.rpc('secure_reserve_appointment', {
    target_slot_id: slotId,
    target_user_id: user.id,
    target_user_email: user.email,
    price: Number(item.price || 150)
  });

  if (supabaseError || !success) {
    Alert.alert('Booking Conflict', 'This specific session window was just claimed by another client.');
    setSubmitting(false);
  } else {
    setConfirmedDetails({
      id: slotId,
      session_timestamp: item.session_timestamp,
      is_booked: true,
      user_id: user.id,
      price: Number(item.price || 150)
    });

    setAllSlots((prev: Appointment[]) => prev.filter((slot: Appointment) => slot.id !== slotId));
    setFilteredSlots((prev: Appointment[]) => prev.filter((slot: Appointment) => slot.id !== slotId));
    setSubmitting(false);
  }
}



async function handleSignOut(): Promise<void> {
  try {
    await supabase.auth.signOut();
    // 💡 INDUSTRY STANDARD: Push the user completely out to the login checkpoint screen
    router.replace("/login" as any);
  } catch (error) {
    console.error("Error signing out:", error);
  }
}

  if (checkingAuth || loading) { 
    return ( 
      <View style={styles.centerContainer}> 
        <ActivityIndicator size="large" color="#007AFF" /> 
        <Text style={styles.loadingText}>Loading engine services securely...</Text> 
      </View> 
    ); 
  } 

  // --- PASTE THIS IN EXACTLY AT LINE 197 ---
const processedSlots = filteredSlots.filter((item: Appointment) => {
  if (!selectedDate) return false;
  try {
    // 💡 Extracts '2026-08-07' out of your database session_timestamp string safely
    const itemDateStr = new Date(item.session_timestamp).toISOString().split('T')[0];
    return selectedDate === itemDateStr;
  } catch {
    return false;
  }
});


 if (confirmedDetails) {
  // 💡 FIX: Split by space or T to grab the literal date ("2026-08-08") completely raw
  const rawDateStr = confirmedDetails.session_timestamp.split(/[ T]/)[0]; 
  const [year, month, day] = rawDateStr.split('-');

  // Force creation at local midnight so hour subtractions can't roll the calendar day backward
  const stableDate = new Date(Number(year), Number(month) - 1, Number(day));
  
  const confirmedDateDisplay = stableDate.toLocaleDateString([], {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
  });

  // Keep time tracking parsing dynamically from the full string
  const cleanIsoString = confirmedDetails.session_timestamp.replace(' ', 'T');
  const confirmedTimeDisplay = new Date(cleanIsoString).toLocaleTimeString([], {
    hour: 'numeric', minute: '2-digit'
  });


  return (
    <View style={styles.container}>
      <View style={styles.successCard}>
        <View style={styles.successIconBubble}>
          <Text style={styles.successIconText}>✓</Text>
        </View>
        <Text style={styles.successTitle}>Reservation Confirmed!</Text>
        <Text style={styles.successSubtitle}>Your session parameter records have been successfully added to production.</Text>
        <View style={styles.receiptContainer}>
          {/* 💡 Updated display strings using the computed layout markers */}
          <View style={styles.receiptRow}><Text style={styles.receiptLabel}>Selected Date:</Text><Text style={styles.receiptVal}>{confirmedDateDisplay}</Text></View> 
          <View style={styles.receiptRow}><Text style={styles.receiptLabel}>Time Window:</Text><Text style={styles.receiptVal}>{confirmedTimeDisplay}</Text></View> 
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
// --- PASTE THIS STARTING AT LINE 267 TO REPLACE THE REST OF THE FILE ---
return (
  <View style={styles.container}>
    <View style={styles.centeredContentWrapper}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Booking</Text>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.segmentContainer}>
        <TouchableOpacity style={[styles.segmentBtn, activeTab === 'book' && styles.segmentBtnActive]} onPress={() => setActiveTab('book')} >
          <Text style={[styles.segmentText, activeTab === 'book' && styles.segmentTextActive]}>Book Session</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.segmentBtn, activeTab === 'schedule' && styles.segmentBtnActive]} onPress={() => setActiveTab('schedule')} >
          <Text style={[styles.segmentText, activeTab === 'schedule' && styles.segmentTextActive]}>My Schedule</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'book' ? (
        <View style={{ flex: 1 }}>
          <Text style={styles.subHeader}>Select an active date square to view open available options.</Text>
          <View style={styles.calendarWrapper}>
            <Calendar
              showSixWeeks={true}
              current={new Date().toISOString().split('T')[0]}
              hideArrows={true}
              disableMonthChange={true}
              markedDates={getMarkedDates()}
              disabledByDefault={true}
              disableAllTouchEventsForDisabledDays={true}
              minDate={new Date().toISOString().split('T')[0]}
              markingType={'custom'}
              onDayPress={(day) => {
                const targetDateConfig = getMarkedDates()[day.dateString];
                if (targetDateConfig && targetDateConfig.disabled) {
                  return;
                }
                handleSelectDay(day.dateString);
              }}
              theme={{
                todayBackgroundColor: 'transparent',
                todayTextColor: '#d9e1e8',
                selectedDayBackgroundColor: '#002b1a',
                arrowColor: '#002b1a',
                textDisabledColor: '#d9e1e8'
              }}
            />
          </View>

          <Modal animationType="fade" transparent={true} visible={!!selectedDate} onRequestClose={() => setSelectedDate('')} >
            <View style={styles.modalOverlayScrim}>
              <View style={styles.modalCardContainer}>
                <View style={styles.modalHeaderRow}>
                  <View>
                    <Text style={styles.modalTitleText}>Available Slots</Text>
                    <Text style={styles.modalDateSubtitle}>{selectedDate}</Text>
                  </View>
                  <TouchableOpacity style={styles.closeModalButton} onPress={() => setSelectedDate('')}>
                    <Text style={styles.closeModalButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>

                {processedSlots.length === 0 ? (
                  <View style={styles.modalEmptyStateBox}>
                    <Text style={styles.noSlotsText}></Text>
                  </View>
                ) : (
                  <FlatList
                    data={processedSlots}
                    keyExtractor={(item: Appointment) => item.id}
                    style={styles.modalScrollableWindow}
                    showsVerticalScrollIndicator={true}
                    renderItem={({ item }: { item: Appointment }) => {
                      // 💡 Format timestamp dynamically for user local view layout display
                      const displayTime = new Date(item.session_timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                      
                      return (
                        <View style={styles.slotCard}>
                          <View style={styles.slotDetails}>
                            <View style={styles.timeBadge}>
                              <Text style={styles.timeBadgeText}>{displayTime}</Text>
                            </View>
                            <View style={styles.priceContainer}>
                              <Text style={styles.priceLabelText}>
                                {item.price ? `$${item.price}.00` : '150.00'}
                              </Text>
                            </View>
                          </View>
                          <TouchableOpacity
                            style={styles.bookButton}
                            disabled={submitting}
                           onPress={() => {
                            if (!user) {
                                router.push('/login' as any);
                                  return;
                                }
                            // 💡 Explicitly pass both the string id and full model reference object
                            bookSession(item.id, item);
                            setSelectedDate('');
                        }}
                          >
                            <Text style={styles.bookButtonText}>Reserve</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    }}
                  />
                )}
              </View>
            </View>
          </Modal>
          {!selectedDate && ( <Text style={styles.promptText}></Text> )}
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>Your Confirmed Appointments:</Text>
          {mySchedule.length === 0 ? (
            <View style={styles.emptyStateBox}>
              <Text style={styles.noSlotsText}>You have no reserved time slots scheduled.</Text>
            </View>
          ) : (
            <FlatList
              data={mySchedule}
              keyExtractor={(item: Appointment) => item.id}
              renderItem={({ item }: { item: Appointment }) => {
                // 💡 Extract both local text representations safely for your history grid cards
                const displayDate = new Date(item.session_timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
                const displayTime = new Date(item.session_timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

                return (
                  <View style={styles.slotCard}>
                    <View style={styles.slotDetails}>
                      <View style={[styles.timeBadge, { backgroundColor: '#e6f4ea' }]}>
                        <Text style={[styles.timeBadgeText, { color: '#137333' }]}>{displayTime}</Text>
                      </View>
                      <Text style={styles.dateLabelText}>{displayDate}</Text>
                    </View>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusBadgeText}>Secured</Text>
                    </View>
                  </View>
                );
              }}
            />
          )}
        </View>
      )}
    </View>
  </View>
);
}


// 🎨 COMPREHENSIVE RESPONSIVE STYLES CONTAINER MAPPED BELOW
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', alignItems: 'center', justifyContent: 'flex-start', width: '100%' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' },
  centeredContentWrapper: { width: '100%', maxWidth: 960, paddingHorizontal: 20, paddingTop: 24, flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  header: { fontSize: 28, fontWeight: 'bold', color: '#111' },
  signOutButton: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  signOutText: { color: '#dc2626', fontWeight: '600', fontSize: 14 },
  segmentContainer: { flexDirection: 'row', backgroundColor: '#e5e7eb', padding: 4, borderRadius: 8, marginBottom: 16 },
  segmentBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  segmentBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  segmentText: { fontSize: 14, fontWeight: '500', color: '#4b5563' },
  segmentTextActive: { color: '#002b1a', fontWeight: '600' },
  subHeader: { fontSize: 14, color: '#6b7280', marginBottom: 12 },
  calendarWrapper: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff', padding: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6 },
  slotCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: 16, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, shadowRadius: 4 },
  slotDetails: { flexDirection: 'row', alignItems: 'center' },
  timeBadge: { backgroundColor: '#e0f2fe', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, marginRight: 12 },
  timeBadgeText: { color: '#0369a1', fontWeight: '600', fontSize: 14 },
  dateLabelText: { fontSize: 15, fontWeight: '500', color: '#374151' },
  bookButton: { backgroundColor: '#002b1a', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6 },
  bookButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  loadingText: { marginTop: 12, color: '#374151', fontSize: 15, fontWeight: '500' },
  emptyStateBox: { padding: 32, backgroundColor: '#ffffff', borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: '#d1d5db', alignItems: 'center', marginTop: 8 },
  noSlotsText: { textAlign: 'center', color: '#9ca3af', fontSize: 14 },
  promptText: { textAlign: 'center', color: '#6b7280', marginTop: 40, fontSize: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 12 },
  statusBadge: { backgroundColor: '#e6f4ea', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  statusBadgeText: { color: '#137333', fontSize: 12, fontWeight: '600' },
  successCard: { backgroundColor: '#fff', padding: 32, borderRadius: 12, alignItems: 'center', width: '100%', maxWidth: 500, borderWidth: 1, borderColor: '#e5e7eb' },
  successIconBubble: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#e6f4ea', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  successIconText: { color: '#137333', fontSize: 24, fontWeight: 'bold' },
  successTitle: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 8 },
  successSubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  receiptContainer: { width: '100%', backgroundColor: '#f9fafb', padding: 16, borderRadius: 8, marginBottom: 24 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  receiptLabel: { color: '#6b7280', fontSize: 14 },
  receiptVal: { color: '#111827', fontWeight: '600', fontSize: 14 },
  receiptTotalRow: { borderTopWidth: 1, borderTopColor: '#d1d5db', paddingTop: 10, marginTop: 10 },
  receiptTotalLabel: { color: '#111827', fontWeight: '600', fontSize: 14 },
  receiptTotalValue: { color: '#002b1a', fontWeight: '700', fontSize: 16 },
  primaryActionBtn: { width: '100%', backgroundColor: '#002b1a', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  primaryActionText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  modalOverlayScrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  modalCardContainer: { width: '100%', maxWidth: 500, backgroundColor: '#fff', borderRadius: 12, paddingVertical: 24, paddingHorizontal: 20},
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitleText: { fontSize: 20, fontWeight: '700', color: '#111827' },
  modalDateSubtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  closeModalButton: { padding: 6 },
  closeModalButtonText: { fontSize: 18, color: '#6b7280' },
  modalScrollableWindow: { maxHeight: 300, marginBottom: 12 },
  modalEmptyStateBox: { paddingVertical: 40, alignItems: 'center' },
    
  // ADD THESE TWO BLOCKS:
  priceContainer: {
    padding: 8,
    // Add any container layout styling you need here
  },
  priceLabelText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000', // Adjust color to fit your UI theme
  },
});
