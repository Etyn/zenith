import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function GameScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View className="flex-1 bg-slate-950 items-center justify-center">
        <Text className="text-white text-xl">Écran de jeu (à venir)</Text>
      </View>
    </SafeAreaView>
  );
}
