/** Haversine distance in meters between two WGS84 coordinates. */
export function distanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getOfficeGeoConfig() {
  // Trugo office — https://maps.app.goo.gl/pn8pQvdsLWpoFaA47
  const lat = Number(process.env.OFFICE_LAT ?? 11.669207222195348);
  const lng = Number(process.env.OFFICE_LNG ?? 78.14333126167497);
  const radiusMeters = Number(process.env.OFFICE_RADIUS_METERS ?? 1500);
  return { lat, lng, radiusMeters };
}

export function isWithinOfficeRadius(latitude: number, longitude: number) {
  const office = getOfficeGeoConfig();
  const distance = distanceMeters(latitude, longitude, office.lat, office.lng);
  return {
    allowed: distance <= office.radiusMeters,
    distanceMeters: Math.round(distance),
    ...office,
  };
}
