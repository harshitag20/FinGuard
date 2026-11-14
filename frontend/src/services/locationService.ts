/**
 * FinGuard Geolocation Service
 * High-accuracy GPS with automatic IP fallback.
 */

export interface LocationData {
  lat: number;
  lng: number;
  accuracy?: number;
  source: 'gps' | 'ip' | 'default';
  locationName?: string;
}

const DEFAULT_COORDS: LocationData = {
  lat: 16.54,
  lng: 81.52,
  source: 'default',
  locationName: 'Bhimavaram, Andhra Pradesh'
};

export const getHighAccuracyLocation = (): Promise<LocationData> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolveIPLocation().then(resolve);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          source: 'gps'
        });
      },
      () => {
        // User denied or GPS timed out -> use IP location fallback seamlessly
        resolveIPLocation().then(resolve);
      },
      {
        enableHighAccuracy: true,
        timeout: 6000,
        maximumAge: 60000
      }
    );
  });
};

export const resolveIPLocation = async (): Promise<LocationData> => {
  try {
    const res = await fetch('https://api.bigdatacloud.net/data/reverse-geocode-client');
    if (res.ok) {
      const data = await res.json();
      if (data.latitude && data.longitude) {
        const city = data.locality || data.city || data.principalSubdivision;
        const state = data.principalSubdivision;
        const locationName = city && state && city !== state ? `${city}, ${state}` : (city || state || DEFAULT_COORDS.locationName);
        return {
          lat: data.latitude,
          lng: data.longitude,
          source: 'ip',
          locationName
        };
      }
    }
  } catch (e) {
    console.warn('IP location resolution fallback', e);
  }
  return DEFAULT_COORDS;
};
