import { Pressable, Text } from 'react-native';

export function ActionButton({
  label,
  onPress,
  tone = 'default',
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  tone?: 'default' | 'primary';
  disabled?: boolean;
}) {
  const bg = tone === 'primary' ? 'bg-indigo-600' : 'bg-slate-700';
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      className={`${bg} ${disabled ? 'opacity-40' : ''} rounded-xl px-4 py-3 my-1`}
    >
      <Text className="text-white text-center font-medium">{label}</Text>
    </Pressable>
  );
}
