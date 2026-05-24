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
      title="Select model"
      options={modelOptions}
      activeOptionId={activeModelId}
      maxWidth={80}
      height={16}
      initialActiveIndex={initialActiveIndex}
      rowLayout="title-metadata"
      placeholder="Search"
      emptyMessage="No models found"
      footer={
        <text>
          <strong>Connect provider</strong>
          <span fg="gray"> ctrl+a  </span>
          <strong>Favorite</strong>
          <span fg="gray"> ctrl+f</span>
        </text>
      }
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
