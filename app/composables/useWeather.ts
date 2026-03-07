export const useWeather = () => {
  const config = useRuntimeConfig();

  const getTodayWeather = () => {
    return useFetch(`https://api.openweathermap.org/data/2.5/weather?q=Seoul&units=metric&appid=${config.public.weatherKey}`);
  };

  return { getTodayWeather };
};
