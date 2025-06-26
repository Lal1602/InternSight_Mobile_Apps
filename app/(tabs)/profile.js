import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import FontAwesome from '@expo/vector-icons/FontAwesome';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import axios from "axios";
import BASE_URL from "../../backend/koneksi";

const Profil = () => {
  const [loading, setLoading] = useState(true);
  const [teacherData, setTeacherData] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchTeacherData = async () => {
      console.log("1. Mulai fetch data");
      try {
        const guruId = await AsyncStorage.getItem("guruId");
        const token = await AsyncStorage.getItem("authToken");

        console.log("2. GuruId:", guruId);
        console.log("3. Token exists:", !!token);

        if (!guruId || !token) {
          console.log("4. GuruId atau token tidak ditemukan");
          Alert.alert("Error", "Data guru tidak ditemukan");
          router.replace("/login/LoginPage");
          return;
        }

        const response = await axios.get(
          `${BASE_URL}/guru/${guruId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        console.log("5. Response diterima:", response.data);

        if (response.data) {
          setTeacherData(response.data);
        }
      } catch (error) {
        console.error("6. Error:", error.message);
      } finally {
        console.log("7. Set loading false");
        setLoading(false);
      }
    };

    fetchTeacherData();
  }, []);

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove([
        "authToken",
        "guruId",
        "guruName"
      ]);

      Alert.alert("Logout", "Anda berhasil logout!");
      router.replace("/login/LoginPage");
    } catch (error) {
      console.error("Gagal logout:", error);
      Alert.alert("Error", "Gagal logout. Silakan coba lagi.");
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#FFF" />
        <Text style={styles.loadingText}>Memuat data guru...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Informasi Guru</Text>

      {teacherData ? (
        <View style={styles.profileContainer}>
          <View style={styles.profileHeader}>
            {/* Tambahkan container dengan border bundar */}
            <View style={styles.iconContainer}>
              <FontAwesome
                name="user"
                size={80}
                color="#666" // Warna abu-abu
                style={styles.userIcon}
              />
            </View>
            <Text style={styles.welcomeText}>Selamat Datang,</Text>
            <Text style={styles.teacherName}>{teacherData.nama_guru}</Text>
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.userInfo}>NIP     : {teacherData.nip || '-'}</Text>
            <Text style={styles.userInfo}>Email   : {teacherData.email || '-'}</Text>
            <Text style={styles.userInfo}>No. HP  : {teacherData.no_hp || '-'}</Text>
          </View>
        </View>
      ) : (
        <Text style={styles.errorText}>Data guru tidak tersedia</Text>
      )}

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    padding: 20,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginTop: 40,
    marginBottom: 30,
  },
  profileContainer: {
    flex: 1,
    width: "100%",
  },
  profileHeader: {
    marginBottom: 30,
    alignItems: "center",
  },
  iconContainer: {
    width: 120,
    height: 120,
    // borderRadius: 5, // Ubah border radius menjadi 10
    backgroundColor: "#fff", // Background putih
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  userIcon: {
    alignSelf: "center",
    color: "#666", // Warna ikon abu-abu
  },
  welcomeText: {
    fontSize: 18,
    color: "#888",
    marginBottom: 10, // Ubah margin bottom menjadi 10
  },
  teacherName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
  infoContainer: {
    backgroundColor: "#000",
    borderWidth:1.5,
    borderColor:"#444",
    // borderRadius: 5, // Ubah border radius menjadi 10
    padding: 20,
    paddingBottom:15,
    marginBottom: 20,
  },
  infoLabel: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 15,
  },
  userInfo: {
    fontSize: 16,
    color: "#fff",
    marginBottom: 10, // Ubah margin bottom menjadi 10
  },
  loadingText: {
    fontSize: 16,
    color: "#fff",
    marginTop: 10,
  },
  errorText: {
    fontSize: 16,
    color: "#DC3545",
    textAlign: "center",
  },
  logoutButton: {
    backgroundColor: "#fff",
    padding: 15,
    // borderRadius: 5,
    marginTop: "auto",
    marginBottom: 20,
    width: "100%",
  },
  logoutButtonText: {
    color: "#000",
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 16,
  },
});

export default Profil;