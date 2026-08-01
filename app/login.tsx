// app/login.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";

export default function SecureLoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // 1. Hydration layout protection gate (Industry standard for Expo web targets)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#002b1a" />
      </View>
    );
  }

  // Step A: Request the 6-to-8 digit secure passcode
  const handleRequestOTP = async (e?: React.FormEvent) => {
    if (e) e.preventDefault(); // Prevents browser layout reloads on web platform targets
    
    if (!email.trim() || !email.includes('@')) {
      Alert.alert("Invalid Input", "Please enter a valid email address.");
      return;
    }

    setLoading(true);
    
    // Supabase automatically signs up new profiles or logs in returning accounts securely
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { 
        shouldCreateUser: true // Automatically creates an account if the user is brand new
      }
    });

    setLoading(false);
    if (error) {
      Alert.alert("Authentication Failed", error.message);
    } else {
      setIsEmailSent(true); // Transitions the page layout smoothly to the numeric verification code box
    }
  };

  // Step B: Verify the passcode securely via the clean standard SDK parameters
  const handleVerifyOTP = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (token.trim().length < 6) {
      Alert.alert("Invalid Code", "Please enter the complete passcode sent to your email.");
      return;
    }

    setLoading(true);

    // INDUSTRY STANDARD: Use type: 'email' with the official client-side token verification method
    const { data: { session }, error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: token.trim(),
      type: 'email' // The exact parameter that maps to your Supabase template output
    });

    setLoading(false);

    if (error) {
      Alert.alert("Verification Error", error.message);
    } else if (session) {
      console.log("Authentication handshake cleared! Session securely generated.");
      // Move past login screens directly into your main user dashboard area
      router.replace("/(tabs)" as any);
    }
  };

  return (
    <View style={styles.mainContainer}>
      <View style={styles.cardWrapper}>
        
        {/* UI SCREEN ONE: Email Input (Handles both Sign Up and Log In) */}
        {!isEmailSent ? (
          <form onSubmit={handleRequestOTP} style={{ width: '100%' }}>
            <h2 style={styles.headingTitle}>Welcome to Coaching</h2>
            <p style={styles.subtextDescription}>
              Enter your email to seamlessly create an account or sign in securely.
            </p>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.formInputField}
                placeholder="name@example.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
              />
            </View>

            <TouchableOpacity 
              style={styles.primaryActionButton} 
              onPress={() => handleRequestOTP()} 
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.buttonTextLayout}>Continue with Email</Text>
              )}
            </TouchableOpacity>
          </form>
        ) : (
          
          /* UI SCREEN TWO: Code Verification Input */
          <form onSubmit={handleVerifyOTP} style={{ width: '100%' }}>
            <h2 style={styles.headingTitle}>Check your inbox</h2>
            <p style={styles.subtextDescription}>
              We sent your secure confirmation passcode directly to <b style={{ color: '#111' }}>{email}</b>.
            </p>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Verification Code</Text>
              <TextInput
                style={[styles.formInputField, styles.otpCenterText]}
                placeholder="0 0 0 0 0 0"
                value={token}
                onChangeText={setToken}
                keyboardType="number-pad"
                maxLength={8} // Dynamically handles both standard 6 and extended 8 digit token forms
                autoFocus
              />
            </View>

            <TouchableOpacity 
              style={styles.primaryActionButton} 
              onPress={() => handleVerifyOTP()} 
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.buttonTextLayout}>Verify & Log In</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.secondaryTextButton} 
              onPress={() => setIsEmailSent(false)}
            >
              <Text style={styles.backButtonText}>← Change email address</Text>
            </TouchableOpacity>
          </form>
        )}

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' },
  mainContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb', padding: 20 },
  cardWrapper: { width: '100%', maxWidth: 420, backgroundColor: '#ffffff', borderRadius: 12, padding: 32, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3, borderWidth: 1, borderColor: '#eaeaea' },
  headingTitle: { fontSize: 24, fontWeight: '700', color: '#111827', textAlign: 'center', margin: 0, marginBottom: 8 },
  subtextDescription: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20, margin: 0, marginBottom: 28 },
  inputContainer: { marginBottom: 20 },

  inputLabel: { 
  fontSize: 13,
  fontWeight: '600', 
  color: '#374151', 
  marginBottom: 6 
},
  formInputField: { width: '100%', height: 48, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6, paddingHorizontal: 14, fontSize: 15, backgroundColor: '#ffffff', color: '#111827' },
  otpCenterText: { textAlign: 'center', fontSize: 22, letterSpacing: 6, fontWeight: '600' },
  primaryActionButton: { width: '100%', height: 48, backgroundColor: '#002b1a', justifyContent: 'center', alignItems: 'center', borderRadius: 6, marginTop: 8 },
  buttonTextLayout: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  secondaryTextButton: { marginTop: 20, alignSelf: 'center' },
  backButtonText: { color: '#6b7280', fontSize: 13, fontWeight: '500' }
});

