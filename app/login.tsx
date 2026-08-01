// app/login.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [loading, setLoading] = useState(false);

  // Step A: Send the 6-Digit code to their inbox
  const handleSendOTP = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: { shouldCreateUser: true } // Creates their account automatically if new
    });

    setLoading(false);
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      setIsEmailSent(true); // Switch UI to the code verification screen
    }
  };

  // Step B: Submit code back to Supabase to establish session
  const handleVerifyOTP = async () => {
    setLoading(true);
    const { data: { session }, error } = await supabase.auth.verifyOtp({
      email: email,
      token: token,
      type: 'email' // Standard token verification parameter
    });

    setLoading(false);
    if (error) {
      Alert.alert("Verification Failed", error.message);
    } else if (session) {
      router.replace("/(tabs)" as any); // Redirects straight to home page dashboard
    }
  };

  if (!isEmailSent) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
        <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 15 }}>Sign In</Text>
        <TextInput
          style={{ borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 6, marginBottom: 15 }}
          placeholder="Enter your email address"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />
        <TouchableOpacity style={{ backgroundColor: '#002b1a', padding: 15, borderRadius: 6 }} onPress={handleSendOTP} disabled={loading}>
          <Text style={{ color: 'white', textAlign: 'center' }}>{loading ? 'Sending...' : 'Send Verification Code'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
      <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 5 }}>Enter Code</Text>
      <p style={{ color: '#666', marginBottom: 15 }}>We sent a secure 6-digit confirmation code to {email}.</p>
      
      <TextInput
        style={{ borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 6, marginBottom: 15, textAlign: 'center', fontSize: 20, letterSpacing: 5 }}
        placeholder="123456"
        value={token}
        onChangeText={setToken}
        keyboardType="number-pad"
        maxLength={6}
      />
      <TouchableOpacity style={{ backgroundColor: '#002b1a', padding: 15, borderRadius: 6 }} onPress={handleVerifyOTP} disabled={loading}>
        <Text style={{ color: 'white', textAlign: 'center' }}>{loading ? 'Verifying...' : 'Verify & Log In'}</Text>
      </TouchableOpacity>
    </View>
  );
}
