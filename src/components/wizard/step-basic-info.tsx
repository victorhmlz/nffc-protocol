import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldControl,
  FieldHint,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { BasicInfo } from "@/lib/wizard/wizard-state";

export interface StepBasicInfoProps {
  readonly value: BasicInfo | null;
  readonly onChange: (info: BasicInfo) => void;
  readonly onNext: () => void;
}

export function StepBasicInfo({ value, onChange, onNext }: StepBasicInfoProps) {
  const [name, setName] = useState(value?.name ?? "");
  const [description, setDescription] = useState(value?.description ?? "");
  const id = useId();

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onChange({ name, description, collectionMode: "new" });
        onNext();
      }}
    >
      <Field hasHint>
        <FieldLabel>Name</FieldLabel>
        <FieldControl>
          <Input
            id={`${id}-name`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Blue Chips"
            required
          />
        </FieldControl>
        <FieldHint>
          Shown on this NFFC and, unless you add it to an existing collection,
          on its new collection too.
        </FieldHint>
      </Field>
      <Field>
        <FieldLabel>Description</FieldLabel>
        <FieldControl>
          <Input
            id={`${id}-description`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional"
          />
        </FieldControl>
      </Field>
      <Button
        type="submit"
        className="self-start"
        disabled={name.trim().length === 0}
      >
        Continue
      </Button>
    </form>
  );
}
