import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getProvinces } from "@/services/external.service";
import { Province } from "@/types/external.type";
import { Combobox } from "@/components/ui/combobox";

export function ProvinceComboBox(props: React.ComponentProps<"input">) {
  const { data: provinces = [], isLoading } = useQuery<Province[]>({
    queryKey: ["provinces"],
    queryFn: () => getProvinces(),
  });

  const options = [...provinces]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((province) => ({
      label: province.name,
      value: province.name,
    }));

  return (
    <Combobox
      options={options}
      {...props}
    />
  );
}