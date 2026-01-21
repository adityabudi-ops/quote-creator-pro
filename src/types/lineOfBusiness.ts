// Line of Business configuration
export const LINE_OF_BUSINESS_OPTIONS = [
  { value: "eb_medical", label: "Employee Benefits – Medical" },
  { value: "eb_medical_life", label: "Employee Benefits – Medical + Life (Bundle)" },
  { value: "eb_life", label: "Employee Benefits – Life Only" },
  { value: "eb_pa", label: "Employee Benefits – Personal Accident" },
  { value: "eb_other", label: "Employee Benefits – Other" },
] as const;

export type LineOfBusinessValue = typeof LINE_OF_BUSINESS_OPTIONS[number]["value"];

export const getLineOfBusinessLabel = (value: string): string => {
  const option = LINE_OF_BUSINESS_OPTIONS.find(o => o.value === value);
  return option?.label || value;
};
