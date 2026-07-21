import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';

type ToastContext = { show: (message: string) => void };

const Ctx = createContext<ToastContext>({ show: () => {} });

export function useToast(): ToastContext {
  return useContext(Ctx);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);

  const show = useCallback((m: string) => {
    setMessage(m);
    setTimeout(() => setMessage(null), 2000);
  }, []);

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {message !== null ? (
        <View pointerEvents="none" className="absolute bottom-10 left-0 right-0 items-center">
          <Text className="bg-slate-800 text-white px-4 py-2 rounded-full overflow-hidden">{message}</Text>
        </View>
      ) : null}
    </Ctx.Provider>
  );
}
