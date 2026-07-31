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
} 

export default function HomeScreen(): React.JSX.Element { 
  // 1. ALL REACT HOOKS INITIALIZED TOGETHER AT THE TOP
  const [userEmail, setUserEmail] = useState<string>(''); 
  const [upcomingSessions, setUpcomingSessions] = useState<Appointment[]>([]); 
  const [loading, setLoading] = useState<boolean>(true); 
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const router = useRouter(); 


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
  async function fetchUserAppointments(userId: string, isMountedFlag: boolean): Promise<void> { 
    setLoading(true); 
    
    const { data, error } = await supabase 
      .from('appointments') 
      .select('id, session_date, session_time, is_booked, user_id') 
      .eq('user_id', userId) 
      .order('session_date', { ascending: true }) 
      .order('session_time', { ascending: true }); 

    if (!isMountedFlag) return; 
    
    if (error) { 
      Alert.alert('Data Retrieval Error', 'Could not read your personal appointment queue updates.'); 
    } else if (data) { 
      setUpcomingSessions(data as Appointment[]); 
    } 
    
    // ADJUSTMENT MADE HERE: Always sets loading to false, even if database is empty!
    setLoading(false); 
  } 

  // 3. HYDRATION ESCAPE RENDERING BLOCK
  if (!isMounted) {
    return <></>;
  }

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
  
  // 6. UI COMPONENT LAYOUT GENERATION
  return ( 
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}> 
      {/* Welcome Header */} 
      <View style={styles.welcomeSection}> 
        <Text style={styles.greetingText}>Welcome Back,</Text> 
        <Text style={styles.emailText}>{userEmail}</Text> 
      </View> 

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
})
