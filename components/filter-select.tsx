import { StyledSelect, type StyledSelectOption } from "@/components/styled-select";

export function FilterSelect(props: { name: string; label: string; defaultValue: string; options: StyledSelectOption[] }) {
  return <StyledSelect {...props} />;
}
