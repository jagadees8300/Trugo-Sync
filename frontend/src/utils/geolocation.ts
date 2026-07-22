/** Request device GPS; used before clock-in geofence check. */
export function getCurrentPosition(): Promise<GeolocationCoordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Location is not supported on this device'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos.coords),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new Error('Please allow location access to clock in'));
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          reject(new Error('Could not detect your location. Try again outdoors or enable GPS'));
        } else if (err.code === err.TIMEOUT) {
          reject(new Error('Location request timed out. Please try again'));
        } else {
          reject(new Error('Could not get your location'));
        }
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  });
}
