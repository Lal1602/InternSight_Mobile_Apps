import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useRouter } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";
import BASE_URL from "../../backend/koneksi";
import { BackHandler } from "react-native";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const backAction = () => {
      BackHandler.exitApp(); // Tutup aplikasi jika tombol back ditekan
      return true; // Mencegah perilaku navigasi bawaan
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, []);

  const handleEmailChange = (text) => {
    setEmail(text);
    if (!text.includes('@')) {
      setEmailError("Isi email dengan benar");
    } else {
      setEmailError("");
    }
  };

  const appendGmail = () => {
    if (!email.includes('@')) {
      const newEmail = email + "@gmail.com";
      setEmail(newEmail);
      setEmailError("");
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Mohon isi email dan password!");
      return;
    }

    if (!email.includes('@')) {
      Alert.alert("Error", "Format email tidak valid!");
      return;
    }

    try {
      const response = await axios.post(`${BASE_URL}/login`, { email, password });

      if (response.data.success) {
        const { user, token } = response.data;
        await AsyncStorage.setItem("authToken", token);
        await AsyncStorage.setItem("guruId", user.id.toString());

        Alert.alert("Login Berhasil!", `Selamat datang di InternSight!`);
        router.push("../splash/splash");
      } else {
        Alert.alert("Login Gagal", response.data.message || "Email atau password salah.");
      }
    } catch (error) {
      console.log("Login Error:", error.response?.data || error.message);
      // Alert.alert("Error", "Terjadi kesalahan pada server atau koneksi!");
      Alert.alert("Error", "Email atau Password salah.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>
          InternSight
        </Text>

        {/* Email Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email:</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={handleEmailChange}
              placeholder="Masukkan email"
              placeholderTextColor="#777"
            />
            <TouchableOpacity style={styles.eyeButton} onPress={appendGmail}>
              <FontAwesome 
                name="at"
                size={13}
                color="#777"
              />
            </TouchableOpacity>
          </View>
          {emailError ? (
            <Text style={styles.errorText}>{emailError}</Text>
          ) : null}
        </View>

        {/* Password Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password:</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              placeholder="Masukkan password"
              placeholderTextColor="#777"
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <FontAwesome
                name={showPassword ? "eye-slash" : "eye"}
                size={13}
                color="#777"
              />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#111",
    padding: 30,
    width: "90%",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    color: "#fff",
    marginBottom: 5,
  },
  inputWrapper: {
    position: "relative",
  },
  input: {
    backgroundColor: "#111",
    borderWidth:1,
    borderColor:'#444',
    color: "#fff",
    padding: 10,
    paddingHorizontal: 10,
  },
  eyeButton: {
    position: "absolute",
    right: 10,
    top: "50%",
    transform: [{ translateY: -8 }],
  },
  button: {
    backgroundColor: "#fff",
    padding: 10,
    marginTop: 20,
  },
  buttonText: {
    color: "#000",
    fontWeight: "bold",
    textAlign: "center",
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 5,
  },
});

export default LoginPage;