export const getRegionName = async (lat: number, lng: number) => {
  const res: any = await $fetch("https://nominatim.openstreetmap.org/reverse", {
    params: {
      lat,
      lon: lng,
      format: "json",
      "accept-language": "ko",
    },
    headers: {
      "User-Agent": "weather-app",
    },
  });

  return res;
};
