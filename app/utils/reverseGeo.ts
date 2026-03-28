/**
 * 지역 이름 조회
 * @param lat
 * @param lng
 * @returns
 */
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

/**
 * 루트 페이지 CurrentWeather의 location-text와 동일: city + borough + suburb (Nominatim 원문).
 * @param res getRegionName() 결과
 */
export const formatKoreanAddressLine = (res: any): string => {
  const a = res?.address;
  if (!a || typeof a !== "object") return "";
  return `${a.city ?? ""} ${a.borough ?? ""} ${a.suburb ?? ""}`.trim().replace(/\s+/g, " ");
};
