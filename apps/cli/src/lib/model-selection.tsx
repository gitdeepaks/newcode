import {
  DEFAULT_CODING_MODEL_ID,
  getCodingModel,
  type CodingModelConfig,
  type CodingModelId,
} from "newcode-ai";
import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";

type ModelSelectionContextValue = {
  modelId: CodingModelId;
  model: CodingModelConfig;
  setModelId: (modelId: CodingModelId) => void;
};

type ModelSelectionProviderProps = {
  children: ReactNode;
};

const ModelSelectionContext = createContext<ModelSelectionContextValue | null>(null);

export function ModelSelectionProvider({ children }: ModelSelectionProviderProps) {
  const [modelId, setModelId] = useState<CodingModelId>(DEFAULT_CODING_MODEL_ID);
  const model = getCodingModel(modelId);

  const value = useMemo<ModelSelectionContextValue>(
    () => ({ modelId, model, setModelId }),
    [model, modelId],
  );

  return (
    <ModelSelectionContext.Provider value={value}>
      {children}
    </ModelSelectionContext.Provider>
  );
}

export function useModelSelection() {
  const context = useContext(ModelSelectionContext);

  if (!context) {
    throw new Error("useModelSelection must be used within ModelSelectionProvider");
  }

  return context;
}
