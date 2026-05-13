import type { KeyEvent } from "@opentui/core";
import { useKeyboard, useRenderer } from "@opentui/react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

export type TuiLayerKeyHandler = (key: KeyEvent) => boolean | void;

type TuiLayer = {
  id: string;
  onKey?: TuiLayerKeyHandler;
};

type TuiLayerManagerContextValue = {
  activeLayerId: string | null;
  registerLayer: (layer: TuiLayer) => () => void;
};

type TuiLayerManagerProviderProps = {
  children: ReactNode;
};

const TuiLayerManagerContext =
  createContext<TuiLayerManagerContextValue | null>(null);

export function TuiLayerManagerProvider({
  children,
}: TuiLayerManagerProviderProps) {
  const renderer = useRenderer();
  const [layers, setLayers] = useState<TuiLayer[]>([]);
  const activeLayerId = layers.at(-1)?.id ?? null;

  const registerLayer = useCallback((layer: TuiLayer) => {
    setLayers((currentLayers) => [...currentLayers, layer]);

    return () => {
      setLayers((currentLayers) =>
        currentLayers.filter((currentLayer) => currentLayer.id !== layer.id),
      );
    };
  }, []);

  useKeyboard((key) => {
    for (const layer of [...layers].reverse()) {
      if (layer.onKey?.(key)) {
        return;
      }
    }

    if (key.ctrl && key.name === "c") {
      renderer.destroy();
    }
  });

  const value = useMemo<TuiLayerManagerContextValue>(
    () => ({ activeLayerId, registerLayer }),
    [activeLayerId, registerLayer],
  );

  return (
    <TuiLayerManagerContext.Provider value={value}>
      {children}
    </TuiLayerManagerContext.Provider>
  );
}

export function useTuiLayer(options?: { onKey?: TuiLayerKeyHandler }) {
  const context = useContext(TuiLayerManagerContext);
  const id = useId();
  const onKeyRef = useRef(options?.onKey);

  onKeyRef.current = options?.onKey;

  if (!context) {
    throw new Error("useTuiLayer must be used within TuiLayerManagerProvider");
  }

  const { activeLayerId, registerLayer } = context;

  useEffect(() => {
    return registerLayer({
      id,
      onKey: (key) => onKeyRef.current?.(key),
    });
  }, [id, registerLayer]);

  return {
    isActiveLayer: activeLayerId === id,
  };
}
