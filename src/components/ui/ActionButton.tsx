import { Pressable, Text } from 'react-native';

export function ActionButton({
  label,
  onPress,
  tone = 'default',
  disabled = false,
  bgColor,
}: {
  label: string;
  onPress: () => void;
  tone?: 'default' | 'primary';
  disabled?: boolean;
  /** Couleur de fond explicite (ex. couleur d'une planète) ; prime sur `tone`. */
  bgColor?: string;
}) {
  const bg = bgColor ? '' : tone === 'primary' ? 'bg-indigo-600' : 'bg-slate-700';
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={bgColor ? { backgroundColor: bgColor } : undefined}
      className={`${bg} ${disabled ? 'opacity-40' : ''} rounded-xl px-4 py-3 my-1`}
    >
      <Text className="text-white text-center font-medium">{label}</Text>
    </Pressable>
  );
}
