import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../lib/supabase/index";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [factorId, setFactorId] = useState("");
  const router = useRouter();

  // SECURE AUTH TRACKER: Automatically checks if the returning user needs to pass a 2FA challenge
  useEffect(() => {
    const checkMfaStatus = async () => {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      
      if (error) return;

      // nextLevel contains 'totp' if they have an active 2FA device hooked up
      if (data.nextLevel === 'totp' && data.currentLevel !== data.nextLevel) {
        setMfaRequired(true);
        
        // Fetch their active authenticator factor ID automatically
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const totpFactor = factors?.all?.find(f => f.factor_type === 'totp' && f.status === 'verified');
        if (totpFactor) {
          setFactorId(totpFactor.id);
        }
      } else if (data.currentLevel === 'totp' || (data.currentLevel === 'aal1' && data.nextLevel === 'aal1')) {
        // Fully authenticated or no MFA set up yet -> proceed safely to bookings
        router.replace("/bookings" as any);
      }
    };

    // Watch auth status changes actively
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        checkMfaStatus();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogin() {
  if (!email) {
    Alert.alert("Error", "Please enter your email address");
    return;
  }
  setLoading(true);

  // FIXED: Explicitly stringify the target URL parameter to prevent Expo build-step stripping
  const targetRedirectUrl = "https://steady-paletas-0ac2df.netlify.app";

  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: {
      emailRedirectTo: targetRedirectUrl,
    },
  });
  
  setLoading(false);
  if (error) {
    Alert.alert("Login Failed", error.message);
  } else {
    Alert.alert(
      "Check your email! ✉️",
      "We sent a secure Magic Login Link to your inbox. Click it to log in.",
    );
  }
}




  // STEP 2: Verify the 6-digit Authenticator App token code securely for free
  async function handleVerify2FA() {
    if (mfaCode.length !== 6) {
      Alert.alert("Error", "Please enter a valid 6-digit verification code.");
      return;
    }
    setLoading(true);

    // Create an atomic server-side safety challenge verification request
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });

    if (challengeError) {
      Alert.alert("MFA Challenge Failed", challengeError.message);
      setLoading(false);
      return;
    }

    // Submit token values to confirm full session security authorization clearance
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code: mfaCode.trim()
    });

    setLoading(false);

    if (verifyError) {
      Alert.alert("Verification Replaced", "Incorrect authenticator code. Try again.");
    } else {
      Alert.alert("Security Verified! 🔒", "Welcome back.");
      router.replace("/bookings" as any);
    }
  }

  // UI RENDER CONDITIONAL: Show the 2FA Code Input screen view if their account requires it
  if (mfaRequired) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Two-Factor Security</Text>
        <Text style={styles.subtitle}>Open your Authenticator app and enter your 6-digit secure code code</Text>
        
        <TextInput 
          style={styles.input} 
          placeholder="000000" 
          placeholderTextColor="#888" 
          value={mfaCode} 
          onChangeText={setMfaCode}
          keyboardType="number-pad"
          maxLength={6}
        />

        <TouchableOpacity style={styles.button} onPress={handleVerify2FA} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? "Verifying..." : "Verify & Continue"}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Client Portal</Text>
      <Text style={styles.subtitle}>Enter your email to sign up or sign in instantly</Text>
      
      <TextInput 
        style={styles.input} 
        placeholder="name@example.com" 
        placeholderTextColor="#888" 
        value={email} 
        onChangeText={setEmail}
        autoCapitalize="none" 
        keyboardType="email-address" 
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "Sending..." : "Send Magic Link"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 8, textAlign: "center" },
  subtitle: { fontSize: 16, color: "#666", marginBottom: 24, textAlign: "center" },
  input: { borderWidth: 1, borderColor: "#ccc", padding: 12, borderRadius: 8, fontSize: 16, marginBottom: 16, textAlign: 'center' },
  button: { backgroundColor: "#007AFF", padding: 14, borderRadius: 8, alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
