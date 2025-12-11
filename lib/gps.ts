/**
 * GPS utilities for event check-in validation
 */

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  // Haversine formula
  const R = 6371e3 // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // Distance in meters
}

/**
 * Validate event check-in based on GPS and time constraints
 */
export function validateEventCheckIn(
  userLat: number,
  userLon: number,
  eventLat: number,
  eventLon: number,
  eventRadius: number,
  eventStart: Date,
  eventEnd: Date
): { valid: boolean; reason?: string; distance?: number } {
  const distance = calculateDistance(userLat, userLon, eventLat, eventLon)
  const now = new Date()

  if (distance > eventRadius) {
    return {
      valid: false,
      reason: `Too far from event (${Math.round(distance)}m away)`,
      distance,
    }
  }

  if (now < eventStart) {
    return { valid: false, reason: 'Event has not started yet' }
  }

  if (now > eventEnd) {
    return { valid: false, reason: 'Event has ended' }
  }

  return { valid: true, distance }
}
