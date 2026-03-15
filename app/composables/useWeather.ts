import { dfs_xy_conv } from "../utils/dfsXyConv";

/**
 * 초단기 실황 조회 (실제 관측값, 수치) - 현재 날씨 정보 조회
 * @param lat
 * @param lng
 * @param base_date
 * @param base_time
 * @returns
 */
export const getUltraSrtNcst = async (lat: number, lng: number, base_date: string, base_time: string) => {
  const grid = dfs_xy_conv("toXY", lat, lng);
  return getUltraSrtNcstByGrid(grid.x, grid.y, base_date, base_time);
};

/** 격자 좌표(nx, ny)로 초단기 실황 조회 - regions 의 x, y 사용 시 */
export const getUltraSrtNcstByGrid = async (nx: number, ny: number, base_date: string, base_time: string) => {
  const config = useRuntimeConfig();
  return $fetch("https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst", {
    params: {
      serviceKey: config.public.weatherKey,
      numOfRows: 10,
      pageNo: 1,
      dataType: "JSON",
      base_date,
      base_time,
      nx,
      ny,
    },
  });
};

/**
 * 초단기예보 조회 - 현재 날씨 : 강수확률, 하늘상태, 아이콘용 데이터
 * @param lat
 * @param lng
 * @param base_date
 * @param base_time
 * @returns
 */
export const getUltraSrtFcst = async (lat: number, lng: number, base_date: string, base_time: string) => {
  const grid = dfs_xy_conv("toXY", lat, lng);
  return getUltraSrtFcstByGrid(grid.x, grid.y, base_date, base_time);
};

/** 격자 좌표(nx, ny)로 초단기예보 조회 - regions 의 x, y 사용 시 */
export const getUltraSrtFcstByGrid = async (nx: number, ny: number, base_date: string, base_time: string) => {
  const config = useRuntimeConfig();
  return $fetch("https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtFcst", {
    params: {
      serviceKey: config.public.weatherKey,
      numOfRows: 50,
      pageNo: 1,
      dataType: "JSON",
      base_date,
      base_time,
      nx,
      ny,
    },
  });
};

/**
 * 단기예보 조회
 * @param lat
 * @param lng
 * @param base_date
 * @param base_time
 * @returns
 */
export const getVilageFcst = async (lat: number, lng: number, base_date: string, base_time: string) => {
  const config = useRuntimeConfig();

  const grid = dfs_xy_conv("toXY", lat, lng);

  const res = await $fetch("https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst", {
    params: {
      serviceKey: config.public.weatherKey,
      numOfRows: 1000,
      pageNo: 1,
      dataType: "JSON",
      base_date,
      base_time,
      nx: grid.x,
      ny: grid.y,
    },
  });
  return res;
};
