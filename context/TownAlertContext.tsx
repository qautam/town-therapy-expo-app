import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Alert } from 'react-native';

import {
  TownAlertModal,
  type TownAlertButton,
  type TownAlertRequest,
} from '@/components/TownAlertModal';

type ShowTownAlert = (
  title: string,
  message?: string,
  buttons?: TownAlertButton[]
) => void;

const TownAlertContext = createContext<ShowTownAlert | null>(null);

let bridge: ShowTownAlert | null = null;

/** Drop-in for Alert.alert — town green card with soft corners. */
export function townAlert(title: string, message?: string, buttons?: TownAlertButton[]) {
  if (bridge) {
    bridge(title, message, buttons);
    return;
  }
  Alert.alert(title, message, buttons);
}

export function TownAlertProvider({ children }: { children: ReactNode }) {
  const [alert, setAlert] = useState<TownAlertRequest | null>(null);

  const show = useCallback<ShowTownAlert>((title, message, buttons) => {
    setAlert({
      title,
      message,
      buttons:
        buttons && buttons.length > 0
          ? buttons
          : [{ text: 'OK', style: 'default' }],
    });
  }, []);

  useEffect(() => {
    bridge = show;
    return () => {
      if (bridge === show) bridge = null;
    };
  }, [show]);

  const dismiss = useCallback(() => setAlert(null), []);

  const value = useMemo(() => show, [show]);

  return (
    <TownAlertContext.Provider value={value}>
      {children}
      <TownAlertModal alert={alert} onDismiss={dismiss} />
    </TownAlertContext.Provider>
  );
}

export function useTownAlert() {
  const show = useContext(TownAlertContext);
  return show ?? townAlert;
}
