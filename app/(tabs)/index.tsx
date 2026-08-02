import React, { useEffect, useState } from 'react'; 
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View, Platform, ScrollView } from 'react-native'; 
import { Ionicons } from '@expo/vector-icons'; 
import { useRouter } from "expo-router"; 
import { supabase } from '@/lib/supabase'; 

interface Appointment { 
  id: string; 
  session_date: string; 
  session_time: string; 
  is_booked: boolean; 
  user_id?: string; 
  client_email?: string; 
  price?: number | string; // Optional price field
} 

export default function HomeScreen(): React.JSX.Element { 
  // 1. ALL REACT HOOKS INITIALIZED TOGETHER AT THE TOP
  const [userEmail, setUserEmail] = useState<string>(''); 
  const [upcomingSessions, setUpcomingSessions] = useState<Appointment[]>([]); 
  const [loading, setLoading] = useState<boolean>(true); 
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const router = useRouter(); 
  const [user, setUser] = useState<any>(null);
  
    // Real-time Auth listener handling both client mounting and session tracking
  useEffect(() => {
    setIsMounted(true);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        // Keeps your existing state variable updated
        setUserEmail(session.user.email || 'Valued Client');
        
        // Triggers your appointment data fetcher
        fetchUserAppointments(session.user.id, true);
        setLoading(false);
      } else {
        setLoading(false);
        router.replace("/login" as any);
      }
    });

    // Clean up the active listener when the user leaves the home screen
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 2. CORE DATABASE CALL IMPLEMENTATION
   const fetchUserAppointments = async (userId: string, showLoading = false) => {
    if (showLoading) setLoading(true);
    
    try {
      // 💡 INDUSTRY STANDARD: Explicit table column selection with ordered date limits
      const { data, error } = await supabase
        .from('appointments') // Ensure this matches your exact Supabase table name
        .select('id, session_date, session_time, is_booked')
        .eq('user_id', userId) // Connects to the logged in user profile ID context
        .gte('session_date', new Date().toISOString().split('T')[0]) // Only fetch future dates
        .order('session_date', { ascending: true })
        .limit(1); // Grabs the single closest upcoming window record

      if (error) throw error;

      if (data && data.length > 0) {
        const nextAppointment = data[0];
        
        // 1. Update your "Your Next Appointment" card layout states
        setUpcomingSessions([nextAppointment]); 
        
        // 2. Update your total count badge (Total Sessions counter card)
        // If you have a separate counter state, calculate total rows:
        // setTotalSessionsCount(data.length);
      } else {
        setUpcomingSessions([]);
      }
    } catch (err) {
      console.error("Error fetching homepage dashboard stats:", err);
    } finally {
      setLoading(false);
    }
  };

  // 4. LOADING MASK VIEW SWITCH
  if (loading) { 
    return ( 
      <View style={styles.center}> 
        <ActivityIndicator size="large" color="#2b1a9e" /> 
        <Text style={styles.loadingText}>Syncing personalized dashboard records securely...</Text> 
      </View> 
    ); 
  } 

  // 5. SECURE SAFE DESTRUCTURING FOR RECORD METRICS
  const nextSession: Appointment | null = upcomingSessions.length > 0 ? upcomingSessions[0] : null; 

// Replace line 91-93 with this:
if (!isMounted || loading) {
  return <></>; // This fixes the TypeScript error safely
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

const handleCancelAppointment = async (slotId: string) => {
  if (!user?.id) return;

  // Confirm user intent before processing changes
  Alert.alert(
    "Cancel Appointment",
    "Are you sure you want to cancel this coaching session?",
    [
      { text: "Keep Appointment", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          try {
            const response = await fetch('https://vercel.app', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                target_slot_id: slotId,
                target_user_id: user.id
              }),
            });

            const result = await response.json();

            if (!response.ok) {
              // This catches your backend 429 spam lock or the 24-hour block rules
              throw new Error(result.error || 'Server error during cancellation.');
            }

            Alert.alert("Success", "Your appointment has been successfully canceled.");
            
            // 🔄 Call your screen's data refetch function to refresh the home state layout
            if (typeof fetchUserAppointments === 'function' && user?.id) {
            fetchUserAppointments(user.id, true);
}


          } catch (err: any) {
            Alert.alert("Cancellation Denied", err.message || "Could not complete operation.");
          }
        }
      }
    ]
  );
};


  // 6. UI COMPONENT LAYOUT GENERATION
  return ( 
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}> 
      {/* Welcome Header */} 
      <View style={styles.welcomeSection}> 
        <Text style={styles.greetingText}>Welcome Back,</Text> 
        <Text style={styles.emailText}>{userEmail}</Text> 
      </View> 

<TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

      {/* Hero Card */} 
      <View style={styles.heroCard}> 
        <View style={styles.heroInfo}> 
          <Text style={styles.heroTitle}>Elevate Your Growth</Text> 
          <Text style={styles.heroSubtitle}>Schedule your next high-impact life coaching session instantly using our active digital matrix calendar layout.</Text> 
          <TouchableOpacity style={styles.heroBtn} onPress={() => router.push("/booking" as any)} > 
            <Text style={styles.heroBtnText}>Open Booking Calendar</Text> 
            <Ionicons name="arrow-forward" size={16} color="#2b1a9e" style={{ marginLeft: 6 }} /> 
          </TouchableOpacity> 
        </View> 
        {Platform.OS === 'web' && ( 
          <View style={styles.heroVisualBlock}> 
            <Ionicons name="sparkles" size={54} color="rgba(255,255,255,0.25)" /> 
          </View> 
        )} 
      </View> 

      {/* Quick Metrics Status Panel */} 
      <View style={styles.metricsGrid}> 
        <View style={styles.metricCard}> 
          <Ionicons name="checkmark-circle-outline" size={24} color="#137333" /> 
          <View style={{ marginLeft: 12 }}> 
            <Text style={styles.metricVal}>{upcomingSessions.length}</Text> 
            <Text style={styles.metricLabel}>Total Sessions</Text> 
          </View> 
        </View> 
        <View style={styles.metricCard}> 
          <Ionicons name="time-outline" size={24} color="#007AFF" /> 
          <View style={{ marginLeft: 12 }}> 
            <Text style={styles.metricVal}>{nextSession ? nextSession.session_time : '--:--'}</Text> 
            <Text style={styles.metricLabel}>Next Window</Text> 
          </View> 
        </View> 
      </View> 

      {/* Next Appointment Block */} 
      <Text style={styles.sectionHeading}>Your Next Appointment</Text> 
      {nextSession ? ( 
        <View style={styles.primarySessionCard}> 
          <View style={styles.sessionAccentBar} /> 
          <View style={styles.sessionDetails}> 
            <View style={styles.sessionDateTimeRow}> 
              <View style={styles.inlineIconText}> 
                <Ionicons name="calendar-sharp" size={16} color="#2b1a9e" /> 
                <Text style={styles.primarySessionDate}>{nextSession.session_date}</Text> 
              </View> 
              <View style={styles.inlineIconText}> 
                <Ionicons name="time-sharp" size={16} color="#2b1a9e" /> 
                <Text style={styles.primarySessionTime}>{nextSession.session_time}</Text> 
              </View> 
            </View> 
            <View style={styles.sessionBadge}> 
              <Text style={styles.sessionBadgeText}>Secured & Confirmed</Text> 
            </View> 
             {/* 👇 ADD THIS DYNAMIC PRICE ROW 👇 */}
  <Text style={styles.priceText}>
  Price: {nextSession && 'price' in nextSession && nextSession.price ? `$${nextSession.price}.00` : '$150.00'}
</Text>
  <View style={styles.badgeContainer}>
    <Text style={styles.securedBadgeText}>Secured & Confirmed</Text>
  </View>
   <TouchableOpacity 
    style={styles.cancelButton}
    onPress={() => handleCancelAppointment(nextSession.id)}
  >
    <Text style={styles.cancelButtonText}>Cancel Session</Text>
  </TouchableOpacity>
          </View> 
        </View> 
      ) : ( 
        <View style={styles.emptySessionCard}> 
          <Ionicons name="calendar-outline" size={32} color="#94a3b8" /> 
          <Text style={styles.emptySessionText}>No upcoming coaching sessions locked into production pipelines.</Text> 
        </View> 
      )} 

      {/* Remaining Timeline */} 
      {upcomingSessions.length > 1 && ( 
        <View style={{ marginTop: 12 }}> 
          <Text style={styles.sectionHeading}>Remaining Schedule Timeline</Text> 
          <FlatList 
            data={upcomingSessions.slice(1)} 
            scrollEnabled={false} 
            keyExtractor={(item) => item.id} 
            renderItem={({ item }) => ( 
              <View style={styles.timelineRowCard}> 
                <View style={styles.timelineLeftBlock}> 
                  <View style={styles.timelineNodeDot} /> 
                  <Text style={styles.timelineDateText}>{item.session_date}</Text> 
                </View> 
                <Text style={styles.timelineTimeText}>{item.session_time}</Text> 
              </View> 
            )} 
          /> 
        </View> 
      )} 
    </ScrollView> 
  ); 
} 

const styles = StyleSheet.create({ 
  container: { flex: 1, backgroundColor: '#f8fafc' }, 
  contentContainer: { padding: 16 }, 
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', minHeight: 300 }, 
  loadingText: { marginTop: 12, color: '#64748b', fontSize: 14 }, 
  welcomeSection: { marginBottom: 20 }, 
   signOutButton: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  signOutText: { color: '#dc2626', fontWeight: '600', fontSize: 14 },
  greetingText: { fontSize: 16, color: '#64748b' }, 
  emailText: { fontSize: 22, fontWeight: 'bold', color: '#1e293b' }, 
  heroCard: { backgroundColor: '#2b1a9e', padding: 20, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }, 
  heroInfo: { flex: 1, marginRight: 10 }, 
  heroTitle: { fontSize: 20, fontWeight: 'bold', color: '#ffffff', marginBottom: 6 }, 
  heroSubtitle: { fontSize: 13, color: '#e2e8f0', marginBottom: 14, lineHeight: 18 }, 
  heroBtn: { backgroundColor: '#ffffff', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' }, 
  heroBtnText: { color: '#2b1a9e', fontWeight: '600', fontSize: 14 }, 
  heroVisualBlock: { width: 64, height: 64, justifyContent: 'center', alignItems: 'center' }, 
  metricsGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 }, 
  metricCard: { flex: 1, backgroundColor: '#ffffff', padding: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' }, 
  metricVal: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' }, 
  metricLabel: { fontSize: 12, color: '#64748b' }, 
  sectionHeading: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 10, marginTop: 10 }, 
  primarySessionCard: { backgroundColor: '#ffffff', borderRadius: 12, flexDirection: 'row', borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' }, 
  sessionAccentBar: { width: 5, backgroundColor: '#2b1a9e' }, 
  sessionDetails: { flex: 1, padding: 16, gap: 10 }, 
  sessionDateTimeRow: { flexDirection: 'row', gap: 16 }, 
  inlineIconText: { flexDirection: 'row', alignItems: 'center', gap: 6 }, 
  primarySessionDate: { fontSize: 14, fontWeight: '600', color: '#334155' }, 
  primarySessionTime: { fontSize: 14, fontWeight: '600', color: '#334155' }, 
  sessionBadge: { alignSelf: 'flex-start', backgroundColor: '#e0f2fe', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20 }, 
  sessionBadgeText: { fontSize: 11, fontWeight: '600', color: '#0369a1' }, 
  emptySessionCard: { backgroundColor: '#ffffff', borderStyle: 'dashed', borderWidth: 2, borderColor: '#cbd5e1', borderRadius: 12, padding: 24, alignItems: 'center', gap: 8 }, 
  emptySessionText: { color: '#64748b', fontSize: 13, textAlign: 'center' }, 
  timelineRowCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: 14, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#f1f5f9' },
  timelineLeftBlock: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timelineNodeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2b1a9e' },
  timelineDateText: { fontSize: 13, fontWeight: '600', color: '#334155' },
  timelineTimeText: { fontSize: 13, fontWeight: '600', color: '#334155' }, 
  priceText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4b5563', // A professional muted dark gray
    marginVertical: 4,
  },
  badgeContainer: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#e0f2fe', // Soft theme blue background
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  securedBadgeText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0369a1', // Solid dark theme blue text
  },

  cancelButton: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#fee2e2', // Light, professional soft pastel red hue
    borderWidth: 1,
    borderColor: '#fca5a5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#b91c1c', // Muted dark red alert color matching the border lines
  },
});
