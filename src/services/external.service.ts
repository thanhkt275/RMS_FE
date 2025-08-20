import { Province } from "@/types/external.type";

export async function getProvinces(size: number = 100): Promise<Province[]> {
  const url = `https://open.oapi.vn/location/provinces?size=${size}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch provinces: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data as Province[];
}