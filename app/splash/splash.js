import React, { useEffect } from "react";
import { View, Text, StyleSheet, Image, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router"; // Menggunakan expo-router untuk navigasi

const Splash = () => {
  const router = useRouter(); // Inisialisasi router

  useEffect(() => {
    const timer = setTimeout(() => {
      // Arahkan ke Home.js setelah 3 detik
      router.push("/home");
    }, 3000);

    return () => clearTimeout(timer); // Membersihkan timer saat komponen di-unmount
  }, []);

  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/images/main-icon.png")}
        style={styles.logo}
      />
      <Text style={styles.title}>InternSight</Text>
      <ActivityIndicator size="large" color="white" style={styles.loader} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 100,
    height: 130,
    // marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    // marginBottom: 10,
  },
  loader: {
    marginTop: 20,
  },
});

export default Splash;
