import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Image,
  Modal,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import SignatureCanvas from 'react-native-signature-canvas';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImageManipulator from 'expo-image-manipulator'; // Import ImageManipulator
import axios from 'axios';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';

const SIGNATURE_DIR = `${FileSystem.documentDirectory}internsight/assets/tanda_tangan/`;

export default function MonitoringForm() {
  const [selectedDate, setSelectedDate] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [studentReports, setStudentReports] = useState(['']);
  const signatureRef = useRef(null);
  const [signatureImage, setSignatureImage] = useState(null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [tempSignature, setTempSignature] = useState(null);
  const router = useRouter();
  const [magangId, setMagangId] = useState(null);

  const validateToken = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) throw new Error('No token found');

      const response = await axiosInstance.get('/validate-token', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.valid) {
        return token;
      } else {
        throw new Error('Invalid token');
      }
    } catch (error) {
      if (error.message === 'Network Error' || error.code === 'ECONNABORTED') {
        Alert.alert(
          'Network Error',
          'Gagal terhubung ke server. Pastikan koneksi internet Anda stabil.',
          [{ text: 'OK' }]
        );
      } else {
        console.error('Token Validation Error:', error);
        await AsyncStorage.multiRemove(['authToken', 'guruId', 'currentLoggedGuruId', 'selectedMagangId']);
        Alert.alert(
          'Sesi Habis',
          'Silakan login ulang.',
          [{ text: 'OK', onPress: () => router.replace('../login/LoginPage') }]
        );
      }
      return null;
    }
  };

  const compressImage = async (uri, maxSizeKB = 5120) => {
    try {
      // Dapatkan informasi file asli
      const fileInfo = await FileSystem.getInfoAsync(uri);
      console.log('Original Image Size:', (fileInfo.size / 1024).toFixed(2) + 'KB');

      // Jika file sudah di bawah maxSizeKB, kembalikan uri asli
      if (fileInfo.size / 1024 < maxSizeKB) {
        return uri;
      }

      // Kompresi bertahap
      const compressionLevels = [
        { quality: 0.8, maxWidth: 2500 },
        { quality: 0.6, maxWidth: 2000 },
        { quality: 0.4, maxWidth: 1500 }
      ];

      for (let config of compressionLevels) {
        const manipResult = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { maxWidth: config.maxWidth } }],
          {
            compress: config.quality,
            format: ImageManipulator.SaveFormat.JPEG
          }
        );

        // Periksa ukuran file hasil kompresi
        const compressedFileInfo = await FileSystem.getInfoAsync(manipResult.uri);
        console.log(`Compressed Image (${config.quality * 100}% quality):`,
          (compressedFileInfo.size / 1024).toFixed(2) + 'KB');

        if (compressedFileInfo.size / 1024 < maxSizeKB) {
          return manipResult.uri;
        }
      }

      // Jika tidak berhasil kompresi, kembalikan uri asli
      return uri;
    } catch (error) {
      console.error('Image compression error:', error);
      return uri;
    }
  };

  useEffect(() => {
    const setupSignatureDirectory = async () => {
      try {
        // First, create the internsight directory if it doesn't exist
        const internsightDir = `${FileSystem.documentDirectory}internsight/`;
        const internsightDirInfo = await FileSystem.getInfoAsync(internsightDir);
        if (!internsightDirInfo.exists) {
          await FileSystem.makeDirectoryAsync(internsightDir, { intermediates: true });
          console.log('Created internsight directory at:', internsightDir);
        }

        // Then create the assets directory
        const assetsDir = `${internsightDir}assets/`;
        const assetsDirInfo = await FileSystem.getInfoAsync(assetsDir);
        if (!assetsDirInfo.exists) {
          await FileSystem.makeDirectoryAsync(assetsDir, { intermediates: true });
          console.log('Created assets directory at:', assetsDir);
        }

        // Finally, create the tanda_tangan directory
        const signatureDirInfo = await FileSystem.getInfoAsync(SIGNATURE_DIR);
        if (!signatureDirInfo.exists) {
          await FileSystem.makeDirectoryAsync(SIGNATURE_DIR, { intermediates: true });
          console.log('Created signature directory at:', SIGNATURE_DIR);
        }
        console.log("SIGNATURE_DIR is set to:", SIGNATURE_DIR);
      } catch (error) {
        console.error('Error setting up directory structure:', error);
        Alert.alert('Error', 'Failed to set up storage directories');
      }
    };

    setupSignatureDirectory();
  }, []);

  // Fungsi konversi base64 ke file
  const base64ToFile = async (base64String) => {
    try {
      // Pastikan direktori ada (sebenarnya sudah dicek di useEffect, tapi tidak apa-apa dicek lagi)
      const dirInfo = await FileSystem.getInfoAsync(SIGNATURE_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(SIGNATURE_DIR, { intermediates: true });
      }

      // Generate nama file unik
      const fileName = `signature_${Date.now()}.png`;
      const fileUri = `${SIGNATURE_DIR}${fileName}`;
      console.log("base64ToFile - File URI being created:", fileUri);

      // Hapus header data:image jika ada
      const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');

      // Tulis file ke direktori tanda_tangan
      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64
      });

      console.log('Signature saved successfully at:', fileUri);
      return fileUri; // Corrected: Return the full fileUri
    } catch (error) {
      console.error('Error saving signature:', error);
      throw error;
    }
  };


  const getMagangId = async () => {
    try {
      const token = await validateToken();
      if (!token) return;

      const guruId = await AsyncStorage.getItem('currentLoggedGuruId');
      const selectedDudikaId = await AsyncStorage.getItem('selectedDudikaId');

      if (!guruId || !selectedDudikaId) {
        Alert.alert('Error', 'Data guru atau dudika tidak ditemukan');
        return;
      }

      const response = await axiosInstance.get('/magang/find', {
        params: {
          guru_id: guruId,
          dudika_id: selectedDudikaId
        },
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data && response.data.id) {
        setMagangId(response.data.id);
        await AsyncStorage.setItem('currentMagangId', response.data.id.toString());
        return response.data.id;
      } else {
        throw new Error('Magang ID not found');
      }
    } catch (error) {
      console.error('Get Magang ID Error:', error);
      if (error.response) {
        Alert.alert('Error', `Gagal mendapatkan ID magang: ${error.response.data.message}`);
      } else {
        Alert.alert('Error', 'Terjadi kesalahan saat mengambil data magang');
      }
      return null;
    }
  };

  const pickImage = async () => {
    // Validasi token sebelum mengambil gambar
    const token = await validateToken();
    if (!token) return;

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Permission to access gallery is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
      base64: false,
    });

    if (!result.canceled && result.assets && result.assets[0].uri) {
      const selectedImage = result.assets[0];
      setImage(selectedImage.uri);
    }
  };

  const axiosInstance = axios.create({
    baseURL: 'http://192.168.0.117:8000/api',
    timeout: 10000, // 10 detik timeout
    timeoutErrorMessage: 'Request timeout. Please check your internet connection.',
  });

  const handleDeleteImage = () => {
    setImage(null);
  };

  // Function to handle signature
  const handleSignature = async (signature) => {
    try {
      if (!signature) {
        console.error("Signature is empty");
        return;
      }

      // Ensure signature has correct base64 format
      const base64Signature = signature.includes('data:image/png;base64,')
        ? signature
        : `data:image/png;base64,${signature}`;

      // Save signature to file and get the file URI
      const fileUri = await base64ToFile(base64Signature);

      // Update state with file URI
      setSignatureImage(fileUri);
      setShowSignatureModal(false);

      console.log('Signature saved successfully at:', fileUri);
    } catch (error) {
      console.error('Error handling signature:', error);
      Alert.alert('Error', 'Failed to save signature');
    }
  };


  const handleEmpty = () => {
    console.log("Signature is empty");
  };

  // Function to save signature (no longer needed as handleSignature saves directly)
  const handleSaveSignature = () => {
    if (tempSignature) {
      setSignatureImage(tempSignature);
      setShowSignatureModal(false);
      Alert.alert('Success', 'Signature saved successfully!');
    } else {
      Alert.alert('Error', 'Please provide a signature before saving');
    }
  };

  // Function to clear signature
  const handleClearSignature = () => {
    if (signatureRef.current) {
      signatureRef.current.clearSignature();
      setTempSignature(null);
    }
  };

  // Function to handle modal close
  const handleCloseSignatureModal = () => {
    setTempSignature(null);
    setShowSignatureModal(false);
  };

  const addStudentReport = () => {
    setStudentReports([...studentReports, '']);
  };

  const removeStudentReport = (index) => {
    if (index === 0) return;
    const newReports = studentReports.filter((_, i) => i !== index);
    setStudentReports(newReports);
  };

  const handleReportChange = (text, index) => {
    const newReports = [...studentReports];
    newReports[index] = text;
    setStudentReports(newReports);
  };

  const handleSubmit = async () => {
    // Validasi input
    if (!selectedDate) {
      Alert.alert('Error', 'Tanggal kunjungan wajib diisi!');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Keterangan wajib diisi!');
      return;
    }

    if (studentReports.filter(report => report.trim() !== '').length === 0) {
      Alert.alert('Error', 'Minimal satu laporan siswa wajib diisi!');
      return;
    }

    if (!image) {
      Alert.alert('Error', 'Foto monitoring wajib dipilih!');
      return;
    }

    if (!signatureImage) {
      Alert.alert('Error', 'Tanda tangan wajib disertakan!');
      return;
    }

    try {
      // Validasi token
      const token = await validateToken();
      if (!token) {
        Alert.alert('Error', 'Token tidak valid');
        return;
      }

      // Ambil ID Magang
      const currentMagangId = await AsyncStorage.getItem('currentMagangId');
      if (!currentMagangId) {
        Alert.alert('Error', 'ID magang tidak ditemukan');
        return;
      }

      // Buat FormData baru
      const formData = new FormData();

      // Append data dasar
      formData.append('magang_id', currentMagangId);
      formData.append('tanggal_kunjungan', selectedDate);
      formData.append('keterangan', description);
      formData.append('laporan_siswa', JSON.stringify(studentReports.filter(report => report.trim() !== '')));

      // Handle foto monitoring
      if (image) {
        // Kompresi foto jika diperlukan
        const compressedImage = await compressImage(image);
        const fileName = compressedImage.split('/').pop();
        const match = /\.(\w+)$/.exec(fileName);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        formData.append('foto', {
          uri: compressedImage,
          type: type,
          name: fileName
        });
        console.log('Foto berhasil ditambahkan ke FormData');
      }

      // Handle tanda tangan
      if (signatureImage) {
        const signatureInfo = await FileSystem.getInfoAsync(signatureImage);
        if (signatureInfo.exists) {
          formData.append('tanda_tangan', {
            uri: signatureImage,
            type: 'image/png',
            name: signatureImage.split('/').pop()
          });
        } else {
          throw new Error('Signature file not found');
        }
      }


      // Set headers
      const headers = {
        'Accept': 'application/json',
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}`
      };

      // Tambahkan timeout yang lebih panjang untuk upload
      const config = {
        headers: headers,
        timeout: 60000, // 60 detik
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          console.log('Upload Progress:', percentCompleted);
        }
      };

      // Kirim request
      console.log('Mengirim request ke server...');
      const response = await axiosInstance.post('/laporan', formData, config);

      // Handle response
      if (response.data) {
        console.log('Response dari server:', response.data);
        Alert.alert(
          'Sukses',
          'Laporan berhasil dikirim!',
          [
            {
              text: 'OK',
              onPress: () => {
                resetForm();
                router.replace('/home'); // Navigate to home after submit
              }
            }
          ]
        );
      }


    } catch (error) {
      console.error('Submit Error:', error);

      // Handle berbagai jenis error
      if (error.response) {
        // Error dari server dengan response
        console.log('Error response data:', error.response.data);
        console.log('Error response status:', error.response.status);
        console.log('Error response headers:', error.response.headers);

        const errorMessage = error.response.data.message || 'Terjadi kesalahan pada server';
        Alert.alert('Error', errorMessage);
      } else if (error.request) {
        // Request dibuat tapi tidak ada response
        console.log('Error request:', error.request);
        Alert.alert(
          'Error',
          'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.'
        );
      } else {
        // Error lainnya
        console.log('Error message:', error.message);
        Alert.alert(
          'Error',
          'Terjadi kesalahan saat mengirim data. Silakan coba lagi.'
        );
      }

      // Log tambahan untuk debugging
      if (error.config) {
        console.log('Error config:', error.config);
      }
    }
  };

  // Fungsi untuk mereset form
  const resetForm = async () => {
    try {
      if (signatureImage) {
        // Delete the signature file
        await FileSystem.deleteAsync(signatureImage);
      }

      setSelectedDate('');
      setDescription('');
      setImage(null);
      setStudentReports(['']);
      setSignatureImage(null);

      console.log('Form reset and signature file cleaned up');
    } catch (error) {
      console.error('Error resetting form:', error);
    }
  };


  useEffect(() => {
    return () => {
      // Cleanup function to remove temporary signature files when component unmounts
      const cleanup = async () => {
        try {
          const files = await FileSystem.readDirectoryAsync(SIGNATURE_DIR);
          for (const file of files) {
            await FileSystem.deleteAsync(`${SIGNATURE_DIR}${file}`);
          }
          console.log('Cleaned up signature directory');
        } catch (error) {
          console.error('Cleanup error:', error);
        }
      };

      cleanup();
    };
  }, []);


  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of today


  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      scrollEnabled={scrollEnabled}
    >
      <Text style={styles.title}>FORM PENGISIAN LAPORAN MONITORING</Text>
      <View style={styles.divider} />

      <Text style={styles.label}>Foto Keterangan:</Text>
      <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
        <Text style={styles.photoButtonText}>Pilih Foto</Text>
      </TouchableOpacity>
      {image && (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: image }} style={styles.imagePreview} />
          <TouchableOpacity style={styles.deleteImageButton} onPress={handleDeleteImage}>
            <Text style={styles.deleteImageButtonText}>Hapus Foto</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.label}>Tanggal Kunjungan:</Text>
      <TouchableOpacity
        style={styles.datePickerButton}
        onPress={() => setShowDatePicker(true)}
      >
        <Text style={styles.datePickerText}>
          {selectedDate || 'Pilih Tanggal'}
        </Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={today}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) setSelectedDate(date.toISOString().split('T')[0]);
          }}
          minimumDate={today}
          maximumDate={today}
        />
      )}

      <Text style={styles.label}>Keterangan Kunjungan:</Text>
      <TextInput
        style={styles.input}
        placeholder="Masukkan keterangan"
        placeholderTextColor="#A9A9A9"
        value={description}
        onChangeText={setDescription}
        multiline
      />

      <Text style={styles.label}>Keterangan Laporan Siswa:</Text>
      {studentReports.map((report, index) => (
        <View key={index} style={styles.reportContainer}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Masukkan Laporan Siswa"
            placeholderTextColor="#A9A9A9"
            value={report}
            onChangeText={(text) => handleReportChange(text, index)}
            multiline
          />
          {index > 0 && (
            <TouchableOpacity
              onPress={() => removeStudentReport(index)}
              style={styles.removeButtonInline}
            >
              <Text style={styles.removeButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
      <TouchableOpacity style={styles.addButton} onPress={addStudentReport}>
        <Text style={styles.addButtonText}>Tambah Laporan Siswa</Text>
      </TouchableOpacity>

      <Text style={styles.label}>Tanda Tangan Dudika:</Text>
      <TouchableOpacity
        style={styles.signatureButton}
        onPress={() => setShowSignatureModal(true)}
      >
        <Text style={styles.signatureButtonText}>
          {signatureImage ? 'Edit Tanda Tangan' : 'Tambah Tanda Tangan'}
        </Text>
      </TouchableOpacity>

      {signatureImage && (
        <View style={styles.signaturePreviewContainer}>
          <Image
            source={{ uri: signatureImage }}
            style={styles.signaturePreview}
            resizeMode="contain"
          />
        </View>
      )}

      <Modal
        visible={showSignatureModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseSignatureModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Gambar tanda tangan</Text>
            <View style={styles.signaturePadContainer}>
              <SignatureCanvas
                ref={signatureRef}
                onOK={handleSignature}
                onEmpty={handleEmpty}
                webStyle={`
                  .m-signature-pad {
                    width: 100%;
                    height: 135%;
                  }
                  .m-signature-pad--footer {
                    display: none;
                  }
                  canvas {
                    width: 100%;
                    height: 100%;

                  }
                `}
                backgroundColor="#FFF"
                penColor="#000"
                imageType="image/png"
                trimWhitespace={true}
              />

            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.clearButton]}
                onPress={() => {
                  if (signatureRef.current) {
                    signatureRef.current.clearSignature();
                    setTempSignature(null); // Reset temporary signature state
                  }
                }}
              >
                <Text style={styles.modalButtonText}>Hapus</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={() => {
                  if (signatureRef.current) {
                    signatureRef.current.readSignature();
                  }
                }}
              >
                <Text style={styles.modalButtonText}>Simpan</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleCloseSignatureModal}
              >
                <Text style={styles.modalButtonText}>Batal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.divider} />

      <TouchableOpacity
        style={styles.submitButton}
        onPress={handleSubmit}
      >
        <Text style={styles.submitButtonText}>Kirim</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#000',
  },
  guruInfoContainer: {
    backgroundColor: '#333',
    padding: 10,
    // borderRadius: 5,
    marginBottom: 20,
    alignItems: 'center',
  },
  guruInfoText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    color: '#FFF',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 25,
    maxWidth: 250,
    textAlign: "center",
    margin: "auto",
  },
  label: {
    fontSize: 16,
    color: '#FFF',
    marginBottom: 10,
    fontWeight: '500',
  },
  photoButton: {
    backgroundColor: '#FFF',
    // borderRadius: 5,
    padding: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  photoButtonText: {
    color: '#000',
    fontWeight: '500',
  },
  imagePreviewContainer: {
    marginBottom: 20,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
    // borderRadius: 5,
  },
  deleteImageButton: {
    marginTop: 10,
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: "#fff",
    padding: 10,
    // borderRadius: 5,
    alignItems: 'center',
  },
  deleteImageButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  signatureButton: {
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: "#fff",
    // borderRadius: 5,
    padding: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  signatureButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  signaturePreviewContainer: {
    height: 200,
    backgroundColor: '#FFF',
    // borderRadius: 5,
    marginBottom: 20,
    padding: 10,
  },
  signaturePreview: {
    width: '100%',
    height: '100%',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    // borderRadius: 5,
    padding: 20,
    width: '90%',
    height: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
    textAlign: 'center',
  },
  signaturePadContainer: {
    flex: 1,
    // borderRadius: 5,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    height: 48, // Tinggi yang seragam
    justifyContent: 'center',
    alignItems: 'center',
    // borderRadius: 5,
    marginHorizontal: 4,
    elevation: 2, // Tambah shadow untuk Android
    shadowColor: '#000', // Shadow untuk iOS
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  clearButton: {
    backgroundColor: '#FFC107',
  },
  saveButton: {
    backgroundColor: '#28A745',
  },
  cancelButton: {
    backgroundColor: '#DC3545',
  },
  datePickerButton: {
    backgroundColor: '#FFF',
    // borderRadius: 5,
    padding: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  datePickerText: {
    color: '#000',
  },
  input: {
    backgroundColor: '#FFF',
    // borderRadius: 5,
    padding: 10,
    marginBottom: 20,
    color: '#000',
    minHeight: 10,
    textAlignVertical: 'top',
  },
  reportContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  removeButton: {
    marginLeft: 10,
    backgroundColor: '#DC3545',
    padding: 8,
    // borderRadius: 5,
  },
  removeButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  removeButtonInline: {
    position: 'absolute',
    right: 5,
    top: '45%',
    transform: [{ translateY: -19 }],
    backgroundColor: 'rgba(220, 53, 69, 0.7)',
    width: 25,
    height: 25,
    // borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: '#fff',
    // borderRadius: 5,
    padding: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  addButtonText: {
    color: '#000',
    fontWeight: '500',
  },
  signatureContainer: {
    height: 200,
    borderWidth: 1,
    borderColor: '#FFF',
    // borderRadius: 5,
    marginBottom: 10,
    overflow: 'hidden',
  },
  clearButton: {
    backgroundColor: '#FFC107',
    // borderRadius: 5,
    padding: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  clearButtonText: {
    color: '#000',
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#FFF',
    // borderRadius: 5,
    padding: 10,
    alignItems: 'center',
    // marginBottom: 8,
  },
  submitButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },

  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#444',
    marginBottom: 20,
  },
});