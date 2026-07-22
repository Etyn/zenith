import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Home() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#020617' }}>
      <View className="flex-1 items-center justify-center gap-6 px-6" style={{ backgroundColor: '#020617' }}>
        <Text className="text-3xl font-bold" style={{ color: '#ffffff' }}>
          Zenith
        </Text>
        <Text className="text-center" style={{ color: '#94a3b8' }}>
          Duel spatial — prototype mobile
        </Text>
        <Link href="/game" asChild>
          <Pressable
            className="rounded-xl"
            style={({ pressed }) => ({
              backgroundColor: pressed ? '#4338ca' : '#4f46e5',
              paddingHorizontal: 28,
              paddingVertical: 14,
            })}
          >
            <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '700' }}>Nouvelle partie solo</Text>
          </Pressable>
        </Link>
      </View>
    </SafeAreaView>
  );
}
