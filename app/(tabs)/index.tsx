import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Platform, FlatList, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

// 💡 FIX 1: Updated interface structure matching your single backend timestamp column
interface Appointment {
  id: string;
  session_timestamp: string; 
  is_booked: boolean;
  user_id?: string;
  client_email?: string;
  price?: number;
}

export default function HomeScreen(): React.JSX.Element {
  // 1. ALL REACT HOOKS INITIALIZED TOGETHER AT THE TOP
  const [userEmail, setUserEmail] = useState<string>('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  // 💡 FIX 2: Updated query to fetch session_timestamp and use current timestamp boundaries natively
  const fetchUserAppointments = async (userId: string, showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('appointments')
        // Pulling the optimized timestamptz column
        .select('id, session_timestamp, is_booked, price')
        .eq('user_id', userId)
        // Only fetch items happening from this exact moment forward
        .gte('session_timestamp', new Date().toISOString())
        .order('session_timestamp', { ascending: true })
        .limit(1);

      if (error) throw error;
      
      if (data && data.length > 0) {
        setUpcomingSessions(data as Appointment[]);
      } else {
        setUpcomingSessions([]);
      }
    } catch (err) {
      console.error("Error fetching homepage dashboard stats:", err);
    } finally {
      setLoading(false);
    }
  };

  // 3. AUTH LISTENER
  useEffect(() => {
    setIsMounted(true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any, session: any) => {
      if (session) {
        setUser(session.user);
        setUserEmail(session.user.email || 'Valued Client');
        fetchUserAppointments(session.user.id, true);
      } else {
        setLoading(false);
        if (isMounted) {
          router.replace("/login" as any);
        }
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [isMounted]);

  // 4. REALTIME DATABASE SUBSCRIPTION 
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`user-appointments-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `user_id=eq.${user.id}`
        },
        (payload: any) => {
          console.log('Change received! Refreshing appointments...', payload);
          fetchUserAppointments(user.id, false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // 5. LOADING MASK VIEW SWITCH
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2b1a9e" />
        <Text style={styles.loadingText}>Syncing personalized dashboard records securely...</Text>
      </View>
    );
  }

  // 6. SECURE SAFE DESTRUCTURING FOR RECORD METRICS
  const nextSession: Appointment | null = upcomingSessions.length > 0 ? upcomingSessions[0] : null;

// 💡 FIX 3: Append 'Z' to explicitly tell JavaScript this string is UTC. 
// It will then convert perfectly to whatever local timezone the user's phone has.
const nextSessionTimeDisplay = nextSession 
  ? new Date(nextSession.session_timestamp.endsWith('Z') 
      ? nextSession.session_timestamp 
      : `${nextSession.session_timestamp}Z`
    ).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) 
  : '--:--';

const nextSessionDateDisplay = nextSession 
  ? new Date(nextSession.session_timestamp.endsWith('Z') 
      ? nextSession.session_timestamp 
      : `${nextSession.session_timestamp}Z`
    ).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) 
  : '';


  if (!isMounted || loading) {
    return <></>;
  }

  const handleUserSignOut = async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      if (typeof setUser === 'function') setUser(null);
      router.replace('/login' as any);
    } catch (err: any) {
      console.error("Sign-out process structural anomaly:", err.message);
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    if (!user?.id) return;
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ is_booked: false, client_email: null, user_id: null })
        .eq('id', appointmentId);

      if (error) throw error;

      setAppointments((prev) => prev.filter((app) => app.id !== appointmentId));
      setUpcomingSessions((prev) => prev.filter((app) => app.id !== appointmentId));

      await fetchUserAppointments(user.id, true);
      Alert.alert("Success", "Session successfully canceled and slot reset!");
    } catch (error) {
      console.error('Cancellation failed:', error);
    }
  };

  // 7. UI COMPONENT LAYOUT GENERATION
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Welcome Header */}
      <View style={styles.welcomeSection}>
        <Text style={styles.greetingText}>Welcome Back,</Text>
        <Text style={styles.emailText}>{userEmail}</Text>
      </View>

      <View style={styles.container}>
        <View style={styles.centeredContentWrapper}>
          {/* Header Row */}
          <View style={styles.headerRow}>
            <Text style={styles.header}>Dashboard</Text>
            <TouchableOpacity style={styles.signOutButton} onPress={handleUserSignOut} >
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>
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
            {/* 💡 FIX 4: Displays computed local clock strings rather than unparsed columns */}
            <Text style={styles.metricVal}>{nextSessionTimeDisplay}</Text>
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
                {/* 💡 FIX 5: Displays computed local date context string */}
                <Text style={styles.primarySessionDate}>{nextSessionDateDisplay}</Text>
              </View>
              <View style={styles.inlineIconText}>
                <Ionicons name="time-sharp" size={16} color="#2b1a9e" />
                {/* 💡 FIX 6: Displays computed local time context string */}
                <Text style={styles.primarySessionTime}>{nextSessionTimeDisplay}</Text>
              </View>
            </View>
            <Text style={styles.priceText}> 
              Price: {nextSession?.price ? `$${nextSession.price}.00` : '$150.00'} 
            </Text>
            <View style={styles.badgeContainer}>
              <Text style={styles.securedBadgeText}>Secured & Confirmed</Text>
            </View>
            <TouchableOpacity style={styles.cancelButton} onPress={() => handleCancelAppointment(upcomingSessions[0].id)} >
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
                renderItem={({ item }: { item: Appointment }) => {
                  const rowDate = new Date(item.session_timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
                  const rowTime = new Date(item.session_timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                  
                  return (
                    <View style={styles.timelineRowCard}>
                      <View style={styles.timelineLeftBlock}>
                        <View style={styles.timelineNodeDot} />
                        <Text style={styles.timelineDateText}>{rowDate}</Text>
                      </View>
                      <Text style={styles.timelineTimeText}>{rowTime}</Text>
                    </View>
                  );
                }} 
              />
            </View>
          )}
        </ScrollView>
      );
    }

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f9fafb', 
    alignItems: 'center', 
    justifyContent: 'flex-start', 
    width: '100%' 
  },
 centeredContentWrapper: { 
    width: '100%', 
    maxWidth: 960, 
    paddingHorizontal: 20, 
    paddingTop: 24, 
    flex: 1 
  },
  contentContainer: { padding: 16 }, 
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', minHeight: 300 }, 
  loadingText: { marginTop: 12, color: '#64748b', fontSize: 14 }, 
  welcomeSection: { marginBottom: 20 }, 
  greetingText: { fontSize: 16, color: '#64748b' }, 
  emailText: { fontSize: 22, fontWeight: 'bold', color: '#1e293b' }, 
 headerRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 20 
  },
  header: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#111' 
  },
  signOutButton: { 
    paddingVertical: 6, 
    paddingHorizontal: 12, 
    borderRadius: 6, 
    backgroundColor: '#fff', 
    borderWidth: 1, 
    borderColor: '#fca5a5' 
  },
  signOutText: { 
    color: '#dc2626', 
    fontWeight: '600', 
    fontSize: 14 
  },
  priceText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4b5563',
    marginVertical: 4,
  },
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

