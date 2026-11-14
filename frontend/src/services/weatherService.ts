/**
 * FinGuard Weather Service
 * Real-time meteorological telemetry powered by Open-Meteo & BigDataCloud geocoding.
 */

export interface WeatherData {
  temp: number;
  condition: string;
  humidity: number;
  apparentTemp: number;
  pressure: number;
  windSpeed: number;
  uvi: number;
  description: string;
  locationName: string;
  coords: { lat: number; lng: number };
}

const WMO_WEATHER_MAP: Record<number, string> = {
  0: 'Clear Sky',
  1: 'Mainly Clear',
  2: 'Partly Cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Depositing Rime Fog',
  51: 'Light Drizzle',
  53: 'Moderate Drizzle',
  55: 'Dense Drizzle',
  61: 'Slight Rain',
  63: 'Moderate Rain',
  65: 'Heavy Rain',
  71: 'Slight Snow',
  80: 'Rain Showers',
  81: 'Moderate Showers',
  82: 'Violent Showers',
  95: 'Thunderstorm'
};

const DEFAULT_WEATHER: WeatherData = {
  temp: 28.5,
  condition: 'Partly Cloudy',
  humidity: 78,
  apparentTemp: 31.0,
  pressure: 1012,
  windSpeed: 8.5,
  uvi: 6.5,
  description: 'Atmospheric telemetry active',
  locationName: 'Bhimavaram, Andhra Pradesh',
  coords: { lat: 16.54, lng: 81.52 }
};

export const fetchWeatherByCoords = async (lat: number, lng: number): Promise<WeatherData> => {
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,surface_pressure,wind_speed_10m,uv_index&timezone=auto`;
  const geoUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;

  try {
    const [weatherRes, geoRes] = await Promise.all([
      fetch(weatherUrl).catch(() => null),
      fetch(geoUrl).catch(() => null)
    ]);

    let locationName = DEFAULT_WEATHER.locationName;
    if (geoRes && geoRes.ok) {
      try {
        const geoData = await geoRes.json();
        const city = geoData.locality || geoData.city || geoData.principalSubdivision;
        const state = geoData.principalSubdivision;
        if (city && state && city !== state) {
          locationName = `${city}, ${state}`;
        } else if (city || state) {
          locationName = city || state;
        }
      } catch (e) {
        console.warn('Geocoding parse fallback', e);
      }
    }

    if (!weatherRes || !weatherRes.ok) {
      return { ...DEFAULT_WEATHER, locationName, coords: { lat, lng } };
    }

    const weatherData = await weatherRes.json();
    const current = weatherData.current || {};
    const weatherCode = current.weather_code ?? 1;
    const condition = WMO_WEATHER_MAP[weatherCode] || 'Clear Sky';

    return {
      temp: Math.round((current.temperature_2m ?? 28) * 10) / 10,
      condition,
      humidity: current.relative_humidity_2m ?? 75,
      apparentTemp: Math.round((current.apparent_temperature ?? current.temperature_2m ?? 28) * 10) / 10,
      pressure: current.surface_pressure ?? 1012,
      windSpeed: current.wind_speed_10m ?? 8,
      uvi: current.uv_index ?? 5,
      description: `${condition} • ${current.relative_humidity_2m ?? 75}% Humidity`,
      locationName,
      coords: { lat, lng }
    };
  } catch (err) {
    console.error('Weather fetch failed, utilizing regional fallback:', err);
    return { ...DEFAULT_WEATHER, coords: { lat, lng } };
  }
};
