import { useState, useEffect } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase/index"; // Double check your relative path matches
import { Session } from "@supabase/supabase-js";

interface UserBookingHistory {
  id: string;
  session_date: string;
  session_time: string;
}

export default function HomeScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const [authView, setAuthView] = useState<"login" | "signup" | "forgot">("login");
  const [initializing, setInitializing] = useState(true); // Prevents flash of login screen
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingHistory, setFetchingHistory] = useState(false);
  const [myBookings, setMyBookings] = useState<UserBookingHistory[]>([]);
  const router = useRouter();

  // 1. ACTIVE AUTH SESSION LISTENER
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitializing(false);
      if (session?.user?.email) fetchMyBookingHistory(session.user.email);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user?.email) {
        fetchMyBookingHistory(session.user.email);
      } else {
        setMyBookings([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchMyBookingHistory(userEmail: string) {
    setFetchingHistory(true);
    const { data, error } = await supabase
      .from("appointments")
      .select("id, session_date, session_time")
      .eq("client_email", userEmail)
      .order("session_date", { ascending: true });

    if (!error && data) {
      setMyBookings(data as UserBookingHistory[]);
    }
    setFetchingHistory(false);
  }

 async function handleSignIn() {
  if (!email || !password) return Alert.alert("Error", "Please fill in all input fields.");
  setLoading(true);
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password: password.trim(),
  });
  setLoading(false); // 🟢 Ensure this is false
  if (error) Alert.alert("Login Failed", error.message);
}

async function handleSignUp() {
  if (!email || !password) return Alert.alert("Error", "Please fill in all input fields.");
  if (password.length < 8) return Alert.alert("Security", "Password must be at least 8 characters.");

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return Alert.alert("Format Error", "Please provide a valid, structured email address layout.");
  }

  setLoading(true);
  const { error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password: password.trim(),
    options: { emailRedirectTo: "https://steady-paletas-0ac2df.netlify.app" }
  });
  
  setLoading(false); // 🟢 FIXED: Changed from true to false
  
  if (error) {
    Alert.alert("Sign Up Failed", error.message);
  } else {
    Alert.alert("Success!", "Account registered successfully!");
    setAuthView("login");
  }
}

  async function handleForgotPassword() {
    if (!email) return Alert.alert("Error", "Please type your email address first.");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: "https://steady-paletas-0ac2df.netlify.app",
    });
    setLoading(false);
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Reset Link Sent ✉️", "Check your email for a secure password modification link.");
      setAuthView("login");
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  // 3. RENDER LOADING BLOCK WHILE VERIFYING AUTH STATUS
  if (initializing) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // ==================== RENDERING COMPONENT LAYOUTS ==================== //

  // CONDITIONAL RULE A: USER IS AUTHENTICATED -> SHOW LOGGED-IN HOME DASHBOARD
  if (session && session.user) {
    return (
      <ScrollView contentContainerStyle={styles.centerContainer}>
        <View style={styles.dashboardCard}>
          <Text style={styles.welcomeTitle}>Welcome Back!</Text>
          <Text style={styles.userBadge}>{session.user.email}</Text>
          
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.push("/booking" as any)}>
            <Text style={styles.buttonText}>Open Booking Calendar 🗓️</Text>
          </TouchableOpacity>

          <Text style={styles.sectionHeading}>Your Upcoming Sessions:</Text>

          {fetchingHistory ? (
            <ActivityIndicator size="small" color="#007AFF" style={{ marginVertical: 12 }} />
          ) : myBookings.length === 0 ? (
            <Text style={styles.emptyText}>You haven't reserved any coaching slots yet.</Text>
          ) : (
            myBookings.map((item) => (
              <View key={item.id} style={styles.historyRow}>
                <Text style={styles.historyDate}>{item.session_date}</Text>
                <Text style={styles.historyTime}>{item.session_time}</Text>
              </View>
            ))
          )}

          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign Out of Portal</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // CONDITIONAL RULE B: USER IS NOT AUTHENTICATED -> SHOW RECONFIGURED PORTAL CARD ON HOME PAGE
  return (
    <View style={styles.container}>
      <View style={styles.authCard}>
        <Text style={styles.title}>
          {authView === "login" && "Client Portal"}
          {authView === "signup" && "Create Account"}
          {authView === "forgot" && "Reset Password"}
        </Text>
        <Text style={styles.subtitle}>
          {authView === "login" && "Sign in using your account password credentials"}
          {authView === "signup" && "Register to lock in unique scheduling windows"}
          {authView === "forgot" && "Submit your email to receive a recovery token link"}
        </Text>

        <TextInput
          style={styles.input}
          placeholder="name@example.com"
          placeholderTextColor="#999"
          value={email}
          onChangeText={(text) => setEmail(text.trim().toLowerCase())}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        {authView !== "forgot" && (
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#999"
            value={password}
            onChangeText={(text) => setPassword(text.trim())}
            secureTextEntry
            autoCapitalize="none"
          />
        )}

        <TouchableOpacity
          style={styles.primaryButton}
          disabled={loading}
          onPress={() => {
            if (authView === "login") handleSignIn();
            if (authView === "signup") handleSignUp();
            if (authView === "forgot") handleForgotPassword();
          }}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>
            {authView === "login" && "Sign In"}
            {authView === "signup" && "Register Account"}
            {authView === "forgot" && "Send Reset Link"}
          </Text>}
        </TouchableOpacity>

        <View style={styles.linkContainer}>
          {authView === "login" ? (
            <>
              <TouchableOpacity onPress={() => setAuthView("signup")}>
                <Text style={styles.blueLink}>Don't have an account? <Text style={styles.underline}>Sign Up</Text></Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setAuthView("forgot")}>
                <Text style={styles.blueLink}>Forgot Password?</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity onPress={() => setAuthView("login")}>
              <Text style={styles.blueLink}>Already have an account? <Text style={styles.underline}>Sign In</Text></Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f4f6f9", padding: 20 },
  centerContainer: { flexGrow: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f4f6f9", padding: 20, paddingTop: 40 },
  authCard: { width: "100%", maxWidth: 440, backgroundColor: "#fff", padding: 32, borderRadius: 16, borderColor: "#eaeaea" },
  dashboardCard: { width: "100%", maxWidth: 460, backgroundColor: "#fff", padding: 28, borderRadius: 16, borderWidth: 1, borderColor: "#eee" },
  title: { fontSize: 26, fontWeight: "700", color: "#111", marginBottom: 8, textAlign: "center" },
  subtitle: { fontSize: 14, color: "#666", marginBottom: 24, textAlign: "center", lineHeight: 20 },
  welcomeTitle: { fontSize: 24, fontWeight: "700", color: "#111", textAlign: "center", marginBottom: 4 },
  userBadge: { fontSize: 14, color: "#555", textAlign: "center", marginBottom: 24, fontWeight: "500", backgroundColor: "#f0f4f8", paddingVertical: 4, paddingHorizontal: 12, borderRadius: 20, alignSelf: "center" },
  input: { borderWidth: 1, borderColor: "#dcdcdc", padding: 14, borderRadius: 8, fontSize: 16, marginBottom: 16, backgroundColor: "#fff", color: "#222" },
  primaryButton: { backgroundColor: "#007AFF", padding: 15, borderRadius: 8, alignItems: "center", marginTop: 4 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  linkContainer: { marginTop: 16, alignItems: "center" },
  blueLink: { color: "#007AFF", fontSize: 14, marginTop: 6 },
  underline: { textDecorationLine: "underline" },
  sectionHeading: { fontSize: 16, fontWeight: "700", color: "#333", marginTop: 24, marginBottom: 12 },
  emptyText: { fontSize: 14, color: "#888", fontStyle: "italic", textAlign: "center", marginVertical: 12 },
  historyRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderColor: "#eee" },
  historyDate: { fontSize: 15, color: "#222", fontWeight: "500" },
  historyTime: { fontSize: 15, color: "#555" },
  signOutButton: { marginTop: 28, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: "#f4f4f4", alignItems: "center" },
  signOutText: { color: "#FF3B30", fontWeight: "600", fontSize: 14 },
});
