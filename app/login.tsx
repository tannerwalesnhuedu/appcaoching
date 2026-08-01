// app/login.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";

export default function UnifiedLoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // 1. Hydration layout protection gate
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

  // 2. Google OAuth Handler
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'https://vercel.app',
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        }
      });

      if (error) throw error;

      if (data?.url && typeof window !== "undefined") {
        window.location.href = data.url;
      }
    } catch (error: any) {
      setGoogleLoading(false);
      Alert.alert("Google Login Error", error.message || "Failed to establish social authorization.");
    }
  };

  // 3. Request 6-Digit Email Code
  const handleRequestOTP = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      Alert.alert("Invalid Input", "Please enter a valid email address.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true }
    });

    setLoading(false);
    if (error) {
      Alert.alert("Authentication Failed", error.message);
    } else {
      setIsEmailSent(true);
    }
  };

  // 4. Verify Code Validation Handler
  const handleVerifyOTP = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (token.trim().length < 6) {
      Alert.alert("Invalid Code", "Please enter the complete passcode.");
      return;
    }

    setLoading(true);
    const { data: { session }, error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: token.trim(),
      type: 'email'
    });

    setLoading(false);
    if (error) {
      Alert.alert("Verification Error", error.message);
    } else if (session) {
      router.replace("/(tabs)" as any);
    }
  };

  return (
    <View style={styles.mainContainer}>
      <View style={styles.cardWrapper}>
        
        {!isEmailSent ? (
          <View style={styles.fullWidthForm}>
            <Text style={styles.headingTitle}>Welcome to Coaching</Text>
            <Text style={styles.subtextDescription}>
              Enter your email to seamlessly create an account or sign in securely.
            </Text>

            {/* Google Authentication Button Component */}
            <TouchableOpacity 
              style={styles.googleOAuthButton} 
              onPress={handleGoogleSignIn}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <ActivityIndicator color="#374151" />
              ) : (
                <View style={styles.googleBtnContent}>
                  <svg style={styles.googleIconSvg} viewBox="0 0 24 24" width="18" height="18">
                    <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.42 1.74l3.3-3.3C17.74 1.58 15.06 1 12 1 7.24 1 3.22 3.73 1.34 7.74l3.87 3C6.13 7.65 8.85 5.04 12 5.04z"/>
                    <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.58l3.73 2.89c2.18-2.01 3.7-4.99 3.7-8.62z"/>
                    <path fill="#FBBC05" d="M5.21 14.74A7.12 7.12 0 0 1 4.75 12c0-.97.16-1.92.46-2.74L1.34 6.26A11.94 11.94 0 0 0 0 12c0 2.08.53 4.04 1.47 5.76l3.74-3.02z"/>
                    <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.92l-3.73-2.89c-1.04.7-2.37 1.11-4.23 1.11-3.15 0-5.87-2.61-6.79-5.71l-3.87 3C3.22 20.27 7.24 23 12 23z"/>
                  </svg>
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Separator Divider Lines */}
            <View style={styles.dividerWrapper}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerLabelText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Input Form */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.formInputField}
                placeholder="name@example.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <TouchableOpacity 
              style={styles.primaryActionButton} 
              onPress={() => handleRequestOTP()} 
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonTextLayout}>Continue with Email</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          
          /* Code Input Screen Layout */
          <View style={styles.fullWidthForm}>
            <Text style={styles.headingTitle}>Check your inbox</Text>
            <Text style={styles.subtextDescription}>
              We sent your secure confirmation passcode directly to <Text style={{ fontWeight: '600', color: '#111827' }}>{email}</Text>.
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Verification Code</Text>
              <TextInput
                style={[styles.formInputField, styles.otpCenterText]}
                placeholder="0 0 0 0 0 0"
                value={token}
                onChangeText={setToken}
                keyboardType="number-pad"
                maxLength={8}
                autoFocus
              />
            </View>

            <TouchableOpacity 
              style={styles.primaryActionButton} 
              onPress={() => handleVerifyOTP()} 
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonTextLayout}>Verify & Log In</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryTextButton} onPress={() => setIsEmailSent(false)}>
              <Text style={styles.backButtonText}>← Change email address</Text>
            </TouchableOpacity>
          </View>
        )}

      </View>
    </View>
  );
}
// 🎨 HIGH-DENSITY SECURE RESPONSIVE LAYOUT FRAMEWORK
const styles = StyleSheet.create({
  centerContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#f9fafb' 
  },
  mainContainer: { 
    flex: 1, 
    width: '100%',
    minHeight: '100%',
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#f9fafb', 
    padding: 24
  },
  cardWrapper: { 
    width: '100%', 
    maxWidth: 420, 
    backgroundColor: '#ffffff', 
    borderRadius: 12, 
    padding: 32, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.04, 
    shadowRadius: 12, 
    elevation: 4, 
    borderWidth: 1, 
    borderColor: '#e5e7eb',
    alignItems: 'center'
  },
  fullWidthForm: {
    width: '100%',
    alignItems: 'center'
  },
  headingTitle: { 
    fontSize: 24, 
    fontWeight: '700', 
    color: '#111827', 
    textAlign: 'center', 
    marginBottom: 8,
    width: '100%'
  },
  subtextDescription: { 
    fontSize: 14, 
    color: '#6b7280', 
    textAlign: 'center', 
    lineHeight: 20, 
    marginBottom: 24,
    width: '100%'
  },
  googleOAuthButton: { 
    width: '100%', 
    height: 44, 
    borderWidth: 1, 
    borderColor: '#d1d5db', 
    borderRadius: 6, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#ffffff',
    marginBottom: 4
  },
  googleBtnContent: { 
    flexDirection: 'row', 
    alignItems: 'center',
    justifyContent: 'center'
  },
  googleIconSvg: { 
    marginRight: 10 
  },
  googleButtonText: { 
    color: '#374151', 
    fontSize: 14, 
    fontWeight: '600' 
  },
  dividerWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginVertical: 20,
    width: '100%'
  },
  dividerLine: { 
    flex: 1, 
    height: 1, 
    backgroundColor: '#e5e7eb' 
  },
  dividerLabelText: { 
    marginHorizontal: 12, 
    color: '#9ca3af', 
    fontSize: 13, 
    fontWeight: '500' 
  },
  inputContainer: { 
    marginBottom: 20,
    width: '100%',
    alignItems: 'flex-start'
  },
  inputLabel: { 
    fontSize: 13, 
    fontWeight: '600', 
    color: '#374151', 
    marginBottom: 6 
  },
  formInputField: { 
    width: '100%', 
    height: 44, 
    borderWidth: 1, 
    borderColor: '#d1d5db', 
    borderRadius: 6, 
    paddingHorizontal: 14, 
    fontSize: 15, 
    backgroundColor: '#ffffff', 
    color: '#111827' 
  },
  otpCenterText: { 
    textAlign: 'center', 
    fontSize: 22, 
    letterSpacing: 6, 
    fontWeight: '600' 
  },
  primaryActionButton: { 
    width: '100%', 
    height: 46, 
    backgroundColor: '#002b1a', 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4
  },
  buttonTextLayout: { 
    color: '#ffffff', 
    fontSize: 14, 
    fontWeight: '600' 
  },
  secondaryTextButton: { 
    marginTop: 20, 
    alignSelf: 'center' 
  },
  backButtonText: { 
    color: '#6b7280', 
    fontSize: 13, 
    fontWeight: '500' 
  }
});
