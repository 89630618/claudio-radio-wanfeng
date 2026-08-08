import { getWeatherLocation, setWeatherLocation } from "./config.js";
import type { SanitizedWeatherContext, WeatherContext } from "./types.js";

export function formatWeatherLine(weather?: WeatherContext): string {
  if (!weather || weather.available === false || weather.summary === "天气暂时不可用") return "";
  return `${weather.city}${weather.summary}${weather.temperature !== undefined ? `，约 ${Math.round(weather.temperature)}°C` : ""}`;
}

export function formatSanitizedWeatherLine(weather?: SanitizedWeatherContext): string {
  if (!weather || !weather.available) return "天气不可用；不得提及真实天气。";
  if (weather.source === "fallback") {
    return "天气有默认兜底数据，但不是用户当前位置验证结果；只能保守对待，不得主动描写具体天气或地点。";
  }
  const parts = [`已验证天气：${weather.summary}`];
  if (weather.temperature !== undefined) parts.push(`约 ${Math.round(weather.temperature)}°C`);
  if (weather.windSpeed !== undefined) parts.push(`风速约 ${Math.round(weather.windSpeed)}km/h`);
  if (weather.observedAt) parts.push(`更新时间 ${weather.observedAt}`);
  return `${parts.join("，")}。不得提及具体地点名称、区县、街道或经纬度。`;
}

const weatherCodes: Record<number, string> = {
  0: "晴朗",
  1: "大致晴朗",
  2: "多云",
  3: "阴天",
  45: "有雾",
  48: "雾凇",
  51: "小毛毛雨",
  53: "毛毛雨",
  55: "较强毛毛雨",
  61: "小雨",
  63: "中雨",
  65: "大雨",
  71: "小雪",
  73: "中雪",
  75: "大雪",
  80: "阵雨",
  81: "较强阵雨",
  82: "强阵雨",
  95: "雷雨"
};

const cacheTTL = 30 * 60 * 1000;
const weatherCache = new Map<string, { data: WeatherContext; timestamp: number }>();

function finiteCoordinate(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

export function updateBrowserWeatherLocation(lat: unknown, lng: unknown) {
  const latitude = finiteCoordinate(lat);
  const longitude = finiteCoordinate(lng);
  if (latitude === undefined || longitude === undefined) {
    throw new Error("invalid weather coordinates");
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new Error("weather coordinates out of range");
  }
  setWeatherLocation(latitude, longitude, "当前位置", "browser");
  return getWeatherLocation();
}

export function sanitizeWeatherForDj(weather?: WeatherContext): SanitizedWeatherContext {
  if (!weather || weather.available === false || weather.summary === "天气暂时不可用") {
    return {
      available: false,
      summary: "天气不可用",
      source: weather?.source ?? "fallback"
    };
  }

  return {
    available: true,
    summary: weather.summary,
    temperature: weather.temperature,
    windSpeed: weather.windSpeed,
    observedAt: weather.observedAt,
    source: weather.source ?? "fallback"
  };
}

export async function getWeatherContext(lat?: number, lng?: number): Promise<WeatherContext> {
  const location = getWeatherLocation();
  const useLat = lat ?? location.lat;
  const useLng = lng ?? location.lng;
  const useCity = location.city;
  const source = lat !== undefined && lng !== undefined ? "browser" : location.source;
  const cacheKey = `${useLat},${useLng}`;
  const cached = weatherCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < cacheTTL) {
    return cached.data;
  }

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(useLat));
  url.searchParams.set("longitude", String(useLng));
  url.searchParams.set("current", "temperature_2m,weather_code,wind_speed_10m");
  url.searchParams.set("timezone", "auto");

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`weather ${response.status}`);

    const data = (await response.json()) as {
      current?: {
        time?: string;
        temperature_2m?: number;
        weather_code?: number;
        wind_speed_10m?: number;
      };
    };

    const code = data.current?.weather_code ?? 0;
    const result: WeatherContext = {
      city: useCity,
      summary: weatherCodes[code] ?? "天气变化中",
      temperature: data.current?.temperature_2m,
      windSpeed: data.current?.wind_speed_10m,
      observedAt: data.current?.time,
      source,
      available: true
    };

    weatherCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch {
    if (cached) return cached.data;
    return {
      city: useCity,
      summary: "天气暂时不可用",
      source,
      available: false
    };
  }
}
