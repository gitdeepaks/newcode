import {
  availableCodingModels,
  type CodingModelId,
  type CodingModelProvider,
} from "newcode-ai";
import {
  SearchListDialog,
  type SearchListDialogOption,
} from "./search-list-dialog";

type ModelDialogProps = {
  activeModelId: CodingModelId;
  onSelect: (modelId: CodingModelId) => void;
  onClose: () => void;
};

const modelOptions = availableCodingModels.map((model) => ({
  id: model.id,
  label: model.label,
  description: model.description,
  metadata: formatProvider(model.provider),
  group: formatProvider(model.provider),
})) satisfies SearchListDialogOption<CodingModelId>[];

export function ModelDialog({ activeModelId, onSelect, onClose }: ModelDialogProps) {
  const initialActiveIndex = Math.max(
    0,
    modelOptions.findIndex((option) => option.id === activeModelId),
  );

  return (
    <SearchListDialog
      title="Model"
      options={modelOptions}
      maxWidth={96}
      initialActiveIndex={initialActiveIndex}
      placeholder="Search models"
      emptyMessage="No models found"
      onOptionSelect={(option) => {
        onSelect(option.id);
        onClose();
      }}
    />
  );
}

function formatProvider(provider: CodingModelProvider) {
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}
