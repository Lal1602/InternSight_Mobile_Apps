import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme'; // Pastikan path sesuai
import Colors from '@/constants/Colors'; // Pastikan path sesuai

// Fungsi TabBarIcon untuk menampilkan ikon di Tab Navigator
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

// Komponen utama layout tab
export default function TabLayout() {
  const colorScheme = useColorScheme(); // Mengambil preferensi warna pengguna (dark/light mode)

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#000', // Warna latar belakang hitam
          borderTopWidth: 0, // Menghilangkan border atas pada tab bar
        },
        tabBarActiveTintColor: '#fff', // Warna font aktif menjadi putih
        tabBarInactiveTintColor: 'gray', // Warna font tidak aktif menjadi abu-abu
        headerShown: false, // Menghilangkan header di setiap tab
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home', // Judul Tab
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />, // Ikon Tab
        }}
      />
      <Tabs.Screen
        name="form"
        options={{
          title: 'Form',
          tabBarIcon: ({ color }) => <TabBarIcon name="pencil" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
        }}
      />
    </Tabs>
  );
}
