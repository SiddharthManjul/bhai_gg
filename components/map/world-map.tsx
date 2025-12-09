/* eslint-disable @next/next/no-img-element */
"use client"

import { useState, useMemo, useCallback } from 'react'
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'

interface MapPin {
  city: string
  country: string
  latitude: number
  longitude: number
  userCount: number
  users: {
    id: string
    name: string
    bio: string | null
    profileImage: string | null
  }[]
}

interface WorldMapProps {
  pins: MapPin[]
}

export default function WorldMap({ pins }: WorldMapProps) {
  const [popupInfo, setPopupInfo] = useState<MapPin | null>(null)

  const markers = useMemo(
    () =>
      pins.map((pin) => (
        <Marker
          key={`${pin.city}-${pin.country}`}
          longitude={pin.longitude}
          latitude={pin.latitude}
          anchor="center"
          onClick={(e) => {
            e.originalEvent.stopPropagation()
            setPopupInfo(pin)
          }}
        >
          <div className="cursor-pointer hover:scale-110 transition-transform">
            {pin.userCount === 1 ? (
              pin.users[0].profileImage ? (
                <div className="w-14 h-14 rounded-full border-4 border-indigo-600 bg-white shadow-lg overflow-hidden">
                  <img
                    src={pin.users[0].profileImage}
                    alt={pin.users[0].name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-full border-4 border-indigo-600 bg-linear-to-br from-purple-500 to-indigo-600 shadow-lg flex items-center justify-center text-white text-xl font-bold">
                  {pin.users[0].name.charAt(0).toUpperCase()}
                </div>
              )
            ) : pin.users[0]?.profileImage ? (
              <div className="relative">
                <div className="w-14 h-14 rounded-full border-4 border-indigo-600 bg-white shadow-lg overflow-hidden">
                  <img
                    src={pin.users[0].profileImage}
                    alt={pin.users[0].name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-indigo-600 border-3 border-white shadow-md flex items-center justify-center text-white text-xs font-bold">
                  {pin.userCount}
                </div>
              </div>
            ) : (
              <div className="w-14 h-14 rounded-full border-4 border-indigo-600 bg-linear-to-br from-indigo-500 to-purple-600 shadow-lg flex items-center justify-center text-white text-lg font-bold">
                {pin.userCount}
              </div>
            )}
          </div>
        </Marker>
      )),
    [pins]
  )

  const handleClosePopup = useCallback(() => {
    setPopupInfo(null)
  }, [])

  return (
    <Map
      initialViewState={{
        latitude: 20,
        longitude: 0,
        zoom: 2,
      }}
      style={{ width: '100%', height: '100%' }}
      mapStyle="https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"
      onClick={() => setPopupInfo(null)}
      renderWorldCopies={false}
    >
      <NavigationControl position="top-right" />
      {markers}

      {popupInfo && (
        <Popup
          anchor="bottom"
          longitude={popupInfo.longitude}
          latitude={popupInfo.latitude}
          onClose={handleClosePopup}
          closeButton={true}
          closeOnClick={false}
          maxWidth="350px"
        >
          <div className="min-w-[300px] max-h-[400px] overflow-y-auto p-2">
            <div className="bg-indigo-600 text-white p-4 rounded-lg -m-2 mb-3">
              <div className="text-lg font-bold mb-1">
                📍 {popupInfo.city}, {popupInfo.country}
              </div>
              <div className="text-sm opacity-90">
                {popupInfo.userCount} {popupInfo.userCount === 1 ? 'member' : 'members'}
              </div>
            </div>

            <div className="space-y-3 px-1">
              {popupInfo.users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  {user.profileImage ? (
                    <img
                      src={user.profileImage}
                      alt={user.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-indigo-600 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-linear-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-lg font-bold shrink-0">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-sm mb-1">
                      {user.name}
                    </div>
                    {user.bio ? (
                      <div className="text-xs text-gray-600 line-clamp-2">
                        {user.bio}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400 italic">
                        No bio provided
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Popup>
      )}
    </Map>
  )
}
