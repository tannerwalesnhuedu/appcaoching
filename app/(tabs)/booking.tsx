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

interface Appointment {
  price: any; 
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
  // Add this near your other useState hooks at the top of the component
  const [user, setUser] = useState<any>(null);


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
        .select('id, session_date, session_time, is_booked, user_id, price') 
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

  // --- PASTE THIS IN PLACE OF LINES 111-116 ---
  const handleSelectDay = (dateString: string): void => {
    // 1. Instantly reject any past date interaction clicks
    if (dateString < todayString) return;

    // 2. Scan your active array to see if any real slots exist for this date
    const dayMatches: Appointment[] = allSlots.filter((slot: Appointment) => {
      try {
        return new Date(slot.session_date).toDateString() === new Date(dateString).toDateString();
      } catch {
        return slot.session_date === dateString;
      }
    });

    // 💡 SECURITY VALIDATION LOCK: If an empty day is clicked, throw an alert and block execution
    if (dayMatches.length === 0) {
      Alert.alert("Scheduling Lockout", "There are no open coaching sessions listed for this date.");
      setSelectedDate(''); // Forces the state to clear so the modal window cannot open
      return;
    }

    // 3. Safe to proceed: mount data state variables and slide up the scrollable popup window
    setFilteredSlots(dayMatches);
    setSelectedDate(dateString);
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



    async function bookSession(slotId: string, date: string, time: string, price: any): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Alert.alert('Authentication', 'Session expired. Please sign back in.');

    // 💡 FRONTEND OVERLAP PROTECTION: Define session length (e.g., 60 minutes)
    const sessionDurationMinutes = 60;
    const requestedStart = new Date(`${date} ${time}`);
    const requestedEnd = new Date(requestedStart.getTime() + sessionDurationMinutes * 60000);

    // Scan your locally saved upcoming schedule rows for any confirmed overlaps
    const hasOverlap = mySchedule.some((appointment) => {
      try {
        const existingStart = new Date(`${appointment.session_date} ${appointment.session_time}`);
        const existingEnd = new Date(existingStart.getTime() + sessionDurationMinutes * 60000);
        // Standard mathematical overlap boundary evaluation formula
        return requestedStart < existingEnd && requestedEnd > existingStart;
      } catch {
        return false;
      }
    });

    if (hasOverlap) {
      Alert.alert(
        'Scheduling Conflict',
        'You already have an appointment scheduled that overlaps with this time window. Please pick a different slot.'
      );
      return;
    }

    setSubmitting(true);

    const { data: success, error } = await supabase.rpc('secure_reserve_appointment', {
      target_slot_id: slotId,
      target_user_id: user.id,
      target_user_email: user.email,
      price: price
    });

    if (error || !success) {
      Alert.alert('Booking Conflict', 'This specific session window was just claimed by another client.');
      setSubmitting(false);
    } else {
      setConfirmedDetails({ id: slotId, session_date: date, session_time: time, is_booked: true, price: price });
      setAllSlots((prev: Appointment[]) => prev.filter((slot: Appointment) => slot.id !== slotId));
      setFilteredSlots((prev: Appointment[]) => prev.filter((slot: Appointment) => slot.id !== slotId));
      setSubmitting(false);
    }
  }

  // Replace lines 219-222 with this:
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
      const selectedFormatted = new Date(selectedDate).toDateString();
      const itemFormatted = new Date(item.session_date).toDateString();
      return selectedFormatted === itemFormatted;
    } catch {
      return item.session_date === selectedDate;
    }
  });

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
// --- PASTE THIS STARTING AT LINE 267 TO REPLACE THE REST OF THE FILE ---
return (
  <View style={styles.container}>
    <View style={styles.centeredContentWrapper}>
      
      <View style={styles.headerRow}>
        <Text style={styles.header}>Dashboard</Text>
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
              minDate={todayString} 
              disableAllTouchEventsForDisabledDays={true} 
              markingType={'custom'} 
              onDayPress={(day) => handleSelectDay(day.dateString)} 
              markedDates={getMarkedDates()} 
              theme={{ 
                todayTextColor: '#002b1a', 
                selectedDayBackgroundColor: '#002b1a', 
                arrowColor: '#002b1a', 
                textDisabledColor: '#d9e1e8' 
              }} 
            />
          </View>

          {/* 🌟 SCROLLABLE POPUP MODAL DIALOG OVERLAY */}
          <Modal
            animationType="fade"
            transparent={true}
            visible={!!selectedDate}
            onRequestClose={() => setSelectedDate('')}
          >
            <View style={styles.modalOverlayScrim}>
              <View style={styles.modalCardContainer}>
                
                {/* Modal Title Banner */}
                <View style={styles.modalHeaderRow}>
                  <View>
                    <Text style={styles.modalTitleText}>Available Slots</Text>
                    <Text style={styles.modalDateSubtitle}>{selectedDate}</Text>
                  </View>
                  <TouchableOpacity style={styles.closeModalButton} onPress={() => setSelectedDate('')}>
                    <Text style={styles.closeModalButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Securely Scrollable Interactive List Box */}
                {processedSlots.length === 0 ? (
                  <View style={styles.modalEmptyStateBox}>
                    <Text style={styles.noSlotsText}>No openings listed on this specific day.</Text>
                  </View>
                ) : (
                  // app/(tabs)/booking.tsx ➔ Inside your Modal's FlatList component, update the renderItem:
<FlatList 
  data={processedSlots} 
  keyExtractor={(item: Appointment) => item.id}
  style={styles.modalScrollableWindow}
  showsVerticalScrollIndicator={true}
  renderItem={({ item }: { item: Appointment }) => (
    <View style={styles.slotCard}>
      <View style={styles.slotDetails}>
        {/* Time Window Indicator */}
        <View style={styles.timeBadge}>
          <Text style={styles.timeBadgeText}>{item.session_time}</Text>
        </View>
        
        {/* 💵 NEW: Industry Standard Price Display */}
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
          // 1. Block booking if the user token or profile is missing
  if (!user) {
    // Navigate them to your authentication screen
    router.push('/login' as any); 
    return;
  }

          bookSession(item.id, item.session_date, item.session_time, item.price);
          setSelectedDate(''); 
        }} 
      >
        <Text style={styles.bookButtonText}>Reserve</Text>
      </TouchableOpacity>
    </View>
  )} 
/>

                )}
              </View>
            </View>
          </Modal>

          {!selectedDate && (
            <Text style={styles.promptText}>Tap an active calendar date square to review options.</Text>
          )}
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
              renderItem={({ item }: { item: Appointment }) => (
                <View style={styles.slotCard}>
                  <View style={styles.slotDetails}>
                    <View style={[styles.timeBadge, { backgroundColor: '#e6f4ea' }]}>
                      <Text style={[styles.timeBadgeText, { color: '#137333' }]}>{item.session_time}</Text>
                    </View>
                    <Text style={styles.dateLabelText}>{item.session_date}</Text>
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
