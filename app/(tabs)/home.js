import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
  LayoutAnimation,
  Platform,
  UIManager,
  Image,
  ActivityIndicator,
} from "react-native";
import { useRouter } from 'expo-router';
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Picker } from "@react-native-picker/picker";
import BASE_URL from "../../backend/koneksi";
import * as FileSystem from 'expo-file-system';

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const Home = () => {
  const [dropdowns, setDropdowns] = useState([false, false, false, false]);
  const [loading, setLoading] = useState(true);
  const [magangList, setMagangList] = useState([]);
  const [selectedDudika, setSelectedDudika] = useState(null);
  const [students, setStudents] = useState([]);
  const [guruName, setGuruName] = useState("");
  const [laporanData, setLaporanData] = useState([]);
  const [maxLaporan] = useState(4);
  const [imageErrors, setImageErrors] = useState({});
  const router = useRouter();

  const ensureDirectoryExists = async () => {
    try {
      const dirPath = `${FileSystem.documentDirectory}internsight/assets/tanda_tangan`;
      const dirInfo = await FileSystem.getInfoAsync(dirPath);

      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
      }
    } catch (error) {
      console.error('Error creating directory:', error);
    }
  };

  const fetchGuruName = async () => {
    try {
      const guruId = await AsyncStorage.getItem("guruId");
      const token = await AsyncStorage.getItem("authToken");

      if (!guruId || !token) {
        console.error("No guru ID or token found");
        return;
      }

      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      const response = await axios.get(`${BASE_URL}/guru/${guruId}`, config);
      if (response.data && response.data.nama_guru) {
        setGuruName(response.data.nama_guru);
        await AsyncStorage.setItem("guruName", response.data.nama_guru);
      }
    } catch (error) {
      console.error("Error fetching guru details:", error);
    }
  };

  const fetchLaporanData = async (magangId) => {
    try {
      if (!magangId) {
        console.log("No magang ID provided");
        return [];
      }

      const token = await AsyncStorage.getItem("authToken");
      if (!token) {
        console.log("No auth token found");
        return [];
      }

      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      const response = await axios.get(
        `${BASE_URL}/laporan/magang/${magangId}`,
        config
      );

      if (response.data?.status === 'success') {
        const laporanList = response.data.data;
        if (Array.isArray(laporanList)) {
          return laporanList.map(laporan => ({
            ...laporan,
            laporan_siswa: JSON.parse(laporan.laporan_siswa),
            tanda_tangan: laporan.tanda_tangan
          }));
        }
      }
      return [];
    } catch (error) {
      console.error("Error fetching laporan:", error);
      return [];
    }
  };

  const saveSelectedMagangAndGuru = async () => {
    try {
      const selectedMagang = magangList.find(
        magang => magang.dudika_id === selectedDudika
      );

      if (selectedMagang) {
        await AsyncStorage.multiSet([
          ['selectedMagangId', selectedMagang.id.toString()],
          ['currentMagangId', selectedMagang.id.toString()],
          ['selectedDudikaId', selectedDudika.toString()]
        ]);
      }
    } catch (error) {
      console.error('Error saving magang ID:', error);
    }
  };

  const fetchData = async () => {
    try {
      const guruId = await AsyncStorage.getItem("guruId");
      const token = await AsyncStorage.getItem("authToken");

      if (!guruId || !token) {
        throw new Error("Missing guruId or token");
      }

      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      const response = await axios.get(
        `${BASE_URL}/magang/guru/${guruId}`,
        config
      );

      const magangWithStudents = response.data.map(magang => ({
        ...magang,
        murid: magang.murid || [],
        dudika_id: magang.dudika_id,
        dudika: magang.dudika
      }));

      setMagangList(magangWithStudents);

      if (magangWithStudents.length > 0) {
        setSelectedDudika(magangWithStudents[0].dudika_id);
      }
    } catch (error) {
      console.error("Error fetching magang data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    if (!selectedDudika) return;

    try {
      const selectedMagang = magangList.find(
        magang => magang.dudika_id === selectedDudika
      );

      if (selectedMagang?.murid?.length > 0) {
        setStudents(selectedMagang.murid);
        return;
      }

      const token = await AsyncStorage.getItem("authToken");
      if (!token) return;

      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      const response = await axios.get(
        `${BASE_URL}/magang/students/${selectedDudika}`,
        config
      );

      setStudents(response.data || []);
    } catch (error) {
      console.error("Error fetching students:", error);
      setStudents([]);
    }
  };

  const toggleDropdown = (index) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setDropdowns(prevState =>
      prevState.map((visible, i) => (i === index ? !visible : visible))
    );
  };

  useEffect(() => {
    const initializeData = async () => {
      try {
        await ensureDirectoryExists();
        await fetchGuruName();
        await fetchData();
      } catch (error) {
        console.error("Initialization Error:", error);
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  useEffect(() => {
    if (selectedDudika && magangList.length > 0) {
      const updateData = async () => {
        try {
          await fetchStudents();
          await saveSelectedMagangAndGuru();

          const selectedMagang = magangList.find(
            magang => magang.dudika_id === selectedDudika
          );

          if (selectedMagang) {
            const laporanList = await fetchLaporanData(selectedMagang.id);
            let fullLaporanList = [...laporanList];

            while (fullLaporanList.length < maxLaporan) {
              fullLaporanList.push({
                id: `empty-${fullLaporanList.length}`,
                tanggal_kunjungan: null,
                isEmpty: true
              });
            }

            fullLaporanList = fullLaporanList.slice(0, maxLaporan);
            setLaporanData(fullLaporanList);
          }
        } catch (error) {
          console.error("Error updating data:", error);
          setLaporanData(Array(maxLaporan).fill(null).map((_, index) => ({
            id: `empty-${index}`,
            tanggal_kunjungan: null,
            isEmpty: true
          })));
        }
      };

      updateData();
    }
  }, [selectedDudika, magangList]);

  const renderLaporanReports = () => {
    // Pisahkan laporan yang sudah ada kunjungan & yang belum
    const laporanDenganTanggal = laporanData.filter(laporan => !laporan.isEmpty);
    const laporanTanpaTanggal = laporanData.filter(laporan => laporan.isEmpty);
    
    // Urutkan laporan dengan tanggal kunjungan dari lama ke baru
    const sortedLaporan = [...laporanDenganTanggal].sort((a, b) => 
      new Date(a.tanggal_kunjungan) - new Date(b.tanggal_kunjungan)
    );
    
    // Gabungkan yang sudah ada kunjungan (diurutkan) dengan yang belum (di bawah)
    const finalLaporanList = [...sortedLaporan, ...laporanTanpaTanggal];
    
    return finalLaporanList.map((laporan, index) => {
      const dudika = magangList.find(m => m.dudika_id === selectedDudika)?.dudika;
      const dudikaName = dudika ? dudika.dudika : '';
      
      return (
        <View key={laporan.id || index} style={index === finalLaporanList.length - 1 ? [styles.reportCard, { marginBottom: 30 }] : styles.reportCard}>
          <View style={styles.reportHeader}>
            <Text style={styles.reportTitle}>
              Laporan Kunjungan Ke <Text style={{ color: '#FFD700' }}>{index + 1}</Text> - {dudikaName}
              {'\n'}
              <Text style={[styles.reportDate, laporan.isEmpty && { color: 'red' }]}>
                {laporan.isEmpty
                  ? 'Belum ada kunjungan'
                  : new Date(laporan.tanggal_kunjungan).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })
                }
              </Text>
            </Text>
            <TouchableOpacity onPress={() => toggleDropdown(index)}>
              <MaterialIcons name="menu" size={20} color="white" />
            </TouchableOpacity>
          </View>
    
          {dropdowns[index] && (
            <View style={styles.dropdownContainer}>
            {!laporan.isEmpty && (
              <View style={styles.laporanDetails}>
                <Text style={styles.detailText}>Keterangan Kunjungan : {laporan.keterangan}</Text>
                <Text style={styles.detailText}>
                  Laporan Siswa : {Array.isArray(laporan.laporan_siswa)
                    ? laporan.laporan_siswa.join(', ')
                    : laporan.laporan_siswa}
                </Text>
              </View>
            )}
            {laporan.isEmpty && (
              <TouchableOpacity
                style={[styles.dropdownButton, styles.newReportButton]}
                onPress={() => router.push('/form')}
              >
                <Text style={styles.dropdownText}>ISI LAPORAN</Text>
              </TouchableOpacity>
            )}
            </View>
            )}
        </View>
      );
    });
  };
  

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="white" />
        <Text style={{ color: 'white', marginTop: 10 }}>Memuat data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.mainContent}>
        <ImageBackground
          source={require("../../assets/images/bg.png")}
          style={styles.header}
        >
          <View style={styles.headerIcons}>
            <Image
              source={require("../../assets/images/main-icon.png")}
              style={styles.logoIcon}
            />
          </View>
          <Text style={styles.headerText}>MEMPERMUDAH <Text>MONITORING</Text></Text>
        </ImageBackground>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NAMA DUDIKA</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedDudika}
              style={[styles.picker, { color: 'white' }]}
              onValueChange={setSelectedDudika}
              dropdownIconColor="white"
              mode="dropdown"
            >
              {magangList.map((magang) => (
                <Picker.Item
                  key={magang.dudika_id}
                  label={magang.dudika.dudika}
                  value={magang.dudika_id}
                  color="#FFFFFF"
                  style={{ backgroundColor: '#333', color: '#FFFFFF' }}
                />
              ))}
            </Picker>
          </View>

          <View style={styles.divider} />

          <View style={styles.grid}>
            <View style={[styles.card, styles.guruCard]}>
              <MaterialIcons name="account-box" size={55} color="white" />
              <Text style={styles.cardText}>{guruName || "Guru"}</Text>
              <Text style={styles.cardSubtext}>Pembimbing</Text>
            </View>

            {students.map((student) => (
              <TouchableOpacity key={student.id} style={styles.card}>
                <MaterialIcons name="account-box" size={38} color="white" />
                <Text style={styles.cardText}>{student.nama_murid}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.divider} />
        {renderLaporanReports()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  signatureImage: {
    width: 200, // atau sesuaikan dengan kebutuhan
    height: 100, // atau sesuaikan dengan kebutuhan
    marginTop: 10,
    backgroundColor: '#444', // untuk memudahkan debug area gambar
  },
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    height: 350,
    justifyContent: "space-between",
    padding: 16,
    marginBottom: 15,
    marginLeft: -15,
    marginRight: -15,
    marginTop: -15,
  },
  headerIcons: {
    flexDirection: "row",
    justifyContent: "center",
  },
  logoIcon: {
    width: 30,
    height: 50,
    marginBottom: -3,
    justifyContent:'center',
  },
  headerText: {
    width:310,
    color: "white",
    fontSize: 26,
    fontWeight: "bold",
    marginTop: 16,
  },
  mainContent: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: "white",
    fontSize: 19,
    fontWeight: "bold",
    marginBottom: 8,
  },
  pickerContainer: {
    backgroundColor: "#333",
    // borderRadius: 5,
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  picker: {
    height: 50,
    width: '100%',
    fontSize: 10,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  card: {
    backgroundColor: "#333",
    // borderRadius: 5,
    width: "47%",
    height: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  guruCard: {
    width: '100%',
    backgroundColor: '#333',
    marginBottom: 16,
    height: 130,
  },
  cardText: {
    color: "white",
    marginTop: 8,
    fontSize: 15,
    textAlign: "center",
  },
  cardSubtext: {
    color: '#999',
    fontSize: 15,
    marginTop: 4,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#444',
    marginBottom: 16,
  },
  reportCard: {
    backgroundColor: "#333",
    // borderRadius: 5,
    padding: 16,
    marginBottom: 8,
  },
  reportHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingLeft: 10,
    paddingright: 10,
  },
  reportTitle: {
    color: "white",
    fontSize: 16,
    lineHeight: 30,
    maxWidth: 150,
    // letterSpacing:1,
  },
  dropdownContainer: {
    backgroundColor: "#444",
    // borderRadius: 5,
    marginTop: 8,
    marginLeft: 8,
    marginRight: 8,
    marginBottom: 8,
    paddingHorizontal: 8, // Sama padding kiri dan kanan
    paddingTop: 6, // Sama padding atas dan bawah
    justifyContent: 'flex-start', // Teks di posisi kiri
    alignItems: 'center', // Menyeimbangkan item horizontal di tengah
  },
  laporanDetails: {
    padding: 0, // Menggunakan padding 0 untuk konten dalam dropdownContainer
  },
  detailText: {
    color: 'white',
    fontSize: 14,
    marginBottom: 8, // Menggunakan nilai yang konsisten
  },
  dropdownButton: {
    backgroundColor: "#555",
    width:250,
    paddingVertical: 12,
    paddingHorizontal: 12,
    // borderRadius: 5,
    alignItems: "center",
    marginTop: 5,
    marginBottom: 10,
    flex: 1, // Tambahkan flex: 1 untuk membuat tombol panjang
  },
  dropdownText: {
    color: "white",
    fontSize: 14,
  },
  newReportButton: {
    backgroundColor: "#666", // Warna tombol baru
  },
});

export default Home;