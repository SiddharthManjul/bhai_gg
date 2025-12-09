// Simple geocoding cache to avoid repeated API calls
const geocodeCache = new Map<string, { latitude: number; longitude: number } | null>()

export async function getCityCoordinates(
  city: string,
  country: string
): Promise<{ latitude: number; longitude: number } | null> {
  const cacheKey = `${city},${country}`

  // Check cache first
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!
  }

  try {
    // Use Nominatim (OpenStreetMap) geocoding service
    // Note: Add a user agent and respect rate limits (max 1 request per second)
    const query = encodeURIComponent(`${city}, ${country}`)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'BhaiGG-Community-Platform',
        },
      }
    )

    if (!response.ok) {
      console.error(`Geocoding failed for ${city}, ${country}`)
      geocodeCache.set(cacheKey, null)
      return null
    }

    const data = await response.json()

    if (data.length === 0) {
      console.warn(`No coordinates found for ${city}, ${country}`)
      geocodeCache.set(cacheKey, null)
      return null
    }

    const coordinates = {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon),
    }

    geocodeCache.set(cacheKey, coordinates)
    return coordinates
  } catch (error) {
    console.error(`Error geocoding ${city}, ${country}:`, error)
    geocodeCache.set(cacheKey, null)
    return null
  }
}

// Helper to add delay between requests to respect rate limits
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
