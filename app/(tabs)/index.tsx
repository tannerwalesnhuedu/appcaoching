import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  ScrollView
} from 'react-native';
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
  const [userEmail, setUserEmail] = useState<string>('');
  const [upcomingSessions, setUpcomingSessions] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      if (!session) {
        router.replace("/(tabs)" as any); 
      } else {
        setUserEmail(session.user.email || 'Valued Client');
        fetchUserAppointments(session.user.id, isMounted);
      }
    });

    return () => { isMounted = false; };
  }, []);

  async function fetchUserAppointments(userId: string, isMounted: boolean): Promise<void> {
    setLoading(true);
    const todayString = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('appointments')
      .select('id, session_date, session_time, is_booked, user_id')
      .eq('user_id', userId)
      .gte('session_date', todayString) 
      .order('session_date', { ascending: true })
      .order('session_time', { ascending: true });

    if (!isMounted) return;
    if (error) {
      Alert.alert('Data Retrieval Error', 'Could not read your personal appointment queue updates.');
    } else if (data) {
      setUpcomingSessions(data as Appointment[]);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2b1a9e" />
        <Text style={styles.loadingText}>Syncing personalized dashboard records securely...</Text>
      </View>
    );
  }

  const nextSession: Appointment | null = upcomingSessions.length > 0 ? upcomingSessions[0] : null;

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
          <TouchableOpacity 
            style={styles.heroBtn}
            onPress={() => router.push("/booking" as any)}
          >
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
              <Text style={styles.sessionBadge}>Secured & Confirmed</Text>
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

// 🎯 COMPLETE STYLES SHEET CONTAINING ALL THE REQUIRED CLASSES
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8fafc' 
  },
  contentContainer: { 
    padding: 24, 
    paddingTop: Platform.OS === 'ios' ? 20 : 30,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center'
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#f8fafc',
    padding: 24 
  },
  loadingText: { 
    marginTop: 14, 
    fontSize: 15, 
    color: '#64748b', 
    fontWeight: '500' 
  },
  welcomeSection: { 
    marginBottom: 24 
  },
  greetingText: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#64748b', 
    textTransform: 'uppercase', 
    letterSpacing: 0.5 
  },
  emailText: { 
    fontSize: 22, 
    fontWeight: '700', 
    color: '#0f172a', 
    marginTop: 2 
  },
  heroCard: { 
    backgroundColor: '#2b1a9e', 
    borderRadius: 16, 
    padding: 24, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 24,
    ...Platform.select({
      ios: { shadowColor: '#2b1a9e', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 4 },
      web: { boxShadow: '0px 8px 30px rgba(43,26,158,0.12)' } as any
    })
  },
  heroInfo: { 
    flex: 2, 
    paddingRight: 12 
  },
  heroTitle: { 
    fontSize: 24, 
    fontWeight: '800', 
    color: '#ffffff', 
    marginBottom: 8 
  },
  heroSubtitle: { 
    fontSize: 13, 
    color: 'rgba(255,255,255,0.8)', 
    lineHeight: 18, 
    marginBottom: 20 
  },
  heroBtn: { 
    backgroundColor: '#ffffff', 
    paddingVertical: 12, 
    paddingHorizontal: 18, 
    borderRadius: 10, 
    flexDirection: 'row', 
    alignItems: 'center', 
    alignSelf: 'flex-start' 
  },
  heroBtnText: { 
    color: '#2b1a9e', 
    fontSize: 14, 
    fontWeight: '700' 
  },
  heroVisualBlock: { 
    flex: 1, 
    alignItems: 'flex-end', 
    justifyContent: 'center' 
  },
  metricsGrid: { 
    flexDirection: 'row', 
    gap: 16, 
    marginBottom: 28 
  },
  metricCard: { 
    flex: 1, 
    backgroundColor: '#ffffff', 
    borderWidth: 1, 
    borderColor: '#e2e8f0', 
    borderRadius: 12, 
    padding: 16, 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  metricVal: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#0f172a' 
  },
  metricLabel: { 
    fontSize: 12, 
    color: '#64748b', 
    fontWeight: '500', 
    marginTop: 1 
  },
  sectionHeading: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#0f172a', 
    marginBottom: 12 
  },
  primarySessionCard: { 
    backgroundColor: '#ffffff', 
    borderWidth: 1, 
    borderColor: '#e2e8f0', 
    borderRadius: 14, 
    flexDirection: 'row', 
    overflow: 'hidden', 
    marginBottom: 24 
  },
  sessionAccentBar: { 
    width: 6, 
    backgroundColor: '#3b82f6' 
  },
  sessionDetails: { 
    flex: 1, 
    padding: 18, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  sessionDateTimeRow: { 
    flexDirection: 'column', 
    gap: 6 
  },
  inlineIconText: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8 
  },
  primarySessionDate: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#0f172a' 
  },
  primarySessionTime: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#334155' 
  },
  sessionBadge: { 
    backgroundColor: '#e6f4ea', 
    paddingVertical: 6, 
    paddingHorizontal: 12, 
    borderRadius: 6 
  },
 emptySessionCard: {backgroundColor: '#ffffff',
  borderWidth: 1,
  borderColor: '#e2e8f0',
  borderRadius: 14,
  padding: 32,
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 24
},
 emptySessionText: {color: '#64748b',
  fontSize: 14,
  textAlign: 'center',
  marginTop: 12,
  lineHeight: 20,
  maxWidth: 280
},
timelineRowCard: {
  backgroundColor: '#ffffff',
  borderWidth: 1,
  borderColor: '#e2e8f0',
  borderRadius: 10,
  padding: 14,
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 10
},
timelineLeftBlock: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12
},
timelineNodeDot: {
  width: 8,
  height: 8,
  borderRadius: 4,
  backgroundColor: '#cbd5e1'
},
timelineDateText: {
  fontSize: 14,
  fontWeight: '600',
  color: '#334155'
},
timelineTimeText: {
  fontSize: 14,
  color: '#64748b',
  fontWeight: '500'
}
});