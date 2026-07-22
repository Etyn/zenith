import type { ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';

export function Sheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose?: () => void;
  children: ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/50 justify-end" onPress={onClose}>
        {/* Pressable interne : absorbe le tap pour ne pas fermer en cliquant le contenu. */}
        <Pressable className="bg-slate-900 rounded-t-3xl p-5 pb-8" onPress={() => undefined}>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
