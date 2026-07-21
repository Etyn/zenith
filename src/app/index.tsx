import { Link } from 'expo-router';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Home() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View className="flex-1 bg-slate-950 items-center justify-center gap-6 px-6">
        <Text className="text-white text-3xl font-bold">Zenith</Text>
        <Text className="text-slate-400 text-center">Duel spatial — prototype mobile</Text>
        <Link href="/game" className="bg-indigo-600 text-white px-6 py-3 rounded-xl overflow-hidden">
          Nouvelle partie solo
        </Link>
      </View>
    </SafeAreaView>
  );
}
