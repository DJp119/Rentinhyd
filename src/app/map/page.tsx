// src/app/map/page.tsx
// Main interactive full-screen map page with top-right layer navigation

'use client';

import { useState, useCallback } from 'react';
import { MapComponent, MapPin, MapLocation, MapLayerVisibility, TemporaryRentPin } from '@/components/Map';
import { MapLayerNavigation } from '@/components/map/MapLayerNavigation';
import { MapAddMenu } from '@/components/MapAddMenu';
import { ListingForm } from '@/components/forms/ListingForm';
// import { SeekerForm } from '@/components/forms/SeekerForm';
import { RentPinForm } from '@/components/forms/RentPinForm';
import { ToLetBoardForm } from '@/components/forms/ToLetBoardForm';
import { ToLetBoardSheet } from '@/components/ToLetBoardSheet';
import { ListingSubmit, /* SeekerSubmit, */ RentPinSubmit } from '@/lib/schemas';
import { ConsentModal } from '@/components/ConsentModal';

export default function MapPage() {
  const [selectedToLetId, setSelectedToLetId] = useState<string | null>(null);
  const [showListForm, setShowListForm] = useState(false);
  // const [showSeekForm, setShowSeekForm] = useState(false);
  const [, setConsentGiven] = useState(false);
  const [submittedRentPins, setSubmittedRentPins] = useState<TemporaryRentPin[]>([]);
  const [mapRefreshToken, setMapRefreshToken] = useState(0);

  const handleConsentAccept = useCallback(() => {
    setConsentGiven(true);
  }, []);

  // States for Map Tap flow
  const [mapLocation, setMapLocation] = useState<MapLocation | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showRentForm, setShowRentForm] = useState(false);
  const [showToLetForm, setShowToLetForm] = useState(false);

  // Layer visibility state
  const [layerVisibility, setLayerVisibility] = useState<MapLayerVisibility>({
    rentPins: true,
    toLetBoards: true,
  });

  const handleToggleRentPins = useCallback(() => {
    setLayerVisibility((prev) => ({ ...prev, rentPins: !prev.rentPins }));
  }, []);

  const handleToggleToLetBoards = useCallback(() => {
    setLayerVisibility((prev) => ({ ...prev, toLetBoards: !prev.toLetBoards }));
    if (selectedToLetId) {
      setSelectedToLetId(null);
    }
  }, [selectedToLetId]);

  const handlePinClick = useCallback((pin: MapPin) => {
    if (pin.type === 'tolet_board') {
      setSelectedToLetId(pin.id);
    } else if (pin.type === 'listing') {
      window.location.href = `/list/${pin.id}`;
    }
  }, []);

  const handleMapClick = useCallback((location: MapLocation) => {
    setMapLocation(location);
    setShowAddMenu(true);
  }, []);

  const handleAddRent = useCallback(() => {
    setShowAddMenu(false);
    setShowRentForm(true);
  }, []);

  const handleAddListing = useCallback(() => {
    setShowAddMenu(false);
    setShowListForm(true);
  }, []);

  /*
  const handleAddSeeker = useCallback(() => {
    setShowAddMenu(false);
    setShowSeekForm(true);
  }, []);
  */

  const handleAddToLet = useCallback(() => {
    setShowAddMenu(false);
    setShowToLetForm(true);
  }, []);

  const handleCloseAddMenu = useCallback(() => {
    setShowAddMenu(false);
    setMapLocation(null);
  }, []);

  const handleCloseSheet = useCallback(() => {
    setSelectedToLetId(null);
  }, []);

  const handleRentSubmit = async (data: RentPinSubmit) => {
    // The form carries the coordinates captured by the Google Maps click.
    // Use that same payload for the optimistic marker so the marker cannot
    // drift from the location that was actually submitted.
    const submittedLocation = { lat: data.lat, lon: data.lon };
    const response = await fetch('/api/rent-pins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to submit rent pin');
    }

    if (result.id) {
      setSubmittedRentPins((prev) => [
        ...prev,
        {
          id: result.id,
          lat: submittedLocation.lat,
          lon: submittedLocation.lon,
          bhk: data.bhk,
          rentMin: data.rentMin,
          rentMax: data.rentMax,
        },
      ]);
    }

    // Ask the map to replace the optimistic marker with the database marker.
    setMapRefreshToken((value) => value + 1);

    setTimeout(() => {
      setShowRentForm(false);
      setMapLocation(null);
    }, 1500);
  };

  const handleListSubmit = async (data: ListingSubmit) => {
    const response = await fetch('/api/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (result.id) {
      setShowListForm(false);
      setMapLocation(null);
      alert('Listing submitted! Please check your email to verify.');
    } else {
      alert(result.error || 'Failed to submit listing');
    }
  };

  /*
  const handleSeekSubmit = async (data: SeekerSubmit) => {
    const response = await fetch('/api/seekers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (result.id) {
      setShowSeekForm(false);
      setMapLocation(null);
      alert('Search submitted! Please check your email to verify.');
    } else {
      alert(result.error || 'Failed to submit search');
    }
  };
  */

  const handleToLetSuccess = () => {
    setShowToLetForm(false);
    setMapLocation(null);
    alert('To-Let board submitted for moderation!');
  };

  return (
    <div className="relative w-screen h-[100dvh] overflow-hidden bg-background select-none">
      {/* Full-Screen Map */}
      <main className="w-full h-full">
        <MapComponent
          visibleLayers={layerVisibility}
          temporaryRentPins={submittedRentPins}
          refreshToken={mapRefreshToken}
          onPinClick={handlePinClick}
          onMapClick={handleMapClick}
          className="w-full h-full"
        />
      </main>

      {/* Top-Right Custom Map Layer Navigation Overlay */}
      <div
        className="absolute top-4 right-4 pointer-events-auto pt-[env(safe-area-inset-top,0px)] pr-[env(safe-area-inset-right,0px)]"
        style={{ zIndex: 'var(--z-map-navigation, 40)' }}
      >
        <MapLayerNavigation
          rentPinsVisible={layerVisibility.rentPins}
          toLetBoardsVisible={layerVisibility.toLetBoards}
          onToggleRentPins={handleToggleRentPins}
          onToggleToLetBoards={handleToggleToLetBoards}
        />
      </div>

      {/* Map Add Menu (on empty map tap) */}
      {showAddMenu && (
        <MapAddMenu
          location={mapLocation}
          onClose={handleCloseAddMenu}
          onRent={handleAddRent}
          onList={handleAddListing}
          /* onSeek={handleAddSeeker} */
          onToLet={handleAddToLet}
        />
      )}

      {/* Rent Pin Form Modal */}
      {showRentForm && mapLocation && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-overlay">
          <div className="bg-backgroundElevated border border-border rounded-xl max-w-xl w-full max-h-[90vh] overflow-y-auto animate-slide-up p-6">
            <div className="border-b border-border pb-4 mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-textPrimary">💰 What rent are you paying?</h2>
              <button
                onClick={() => { setShowRentForm(false); setMapLocation(null); }}
                className="p-2 text-textMuted hover:text-textPrimary transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <RentPinForm
              location={mapLocation ?? { lat: 17.4435, lon: 78.3772 }}
              onSubmit={handleRentSubmit}
              onCancel={() => { setShowRentForm(false); setMapLocation(null); }}
            />
          </div>
        </div>
      )}

      {/* To-Let Board Form Modal */}
      {showToLetForm && mapLocation && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-overlay">
          <div className="bg-backgroundElevated border border-border rounded-xl max-w-xl w-full max-h-[90vh] overflow-y-auto animate-slide-up p-6">
            <div className="border-b border-border pb-4 mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-textPrimary">🪧 Spotted a To-Let board?</h2>
              <button
                onClick={() => { setShowToLetForm(false); setMapLocation(null); }}
                className="p-2 text-textMuted hover:text-textPrimary transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <ToLetBoardForm
              location={mapLocation}
              onSuccess={handleToLetSuccess}
              onCancel={() => { setShowToLetForm(false); setMapLocation(null); }}
            />
          </div>
        </div>
      )}

      {/* To-Let Board Detail Sheet */}
      {selectedToLetId && (
        <ToLetBoardSheet
          id={selectedToLetId}
          onClose={handleCloseSheet}
        />
      )}

      {/* Consent Modal */}
      <ConsentModal onAccept={handleConsentAccept} />

      {/* Listing Form Modal */}
      {showListForm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-overlay">
          <div className="bg-backgroundElevated border border-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-semibold text-textPrimary">List Your Property</h2>
              <button
                onClick={() => { setShowListForm(false); setMapLocation(null); }}
                className="p-2 text-textMuted hover:text-textPrimary transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <ListingForm
                initialLocation={mapLocation ?? undefined}
                onSubmit={handleListSubmit}
                onCancel={() => { setShowListForm(false); setMapLocation(null); }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Seeker Form Modal - Temporarily disabled from map popup
      {showSeekForm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-overlay">
          <div className="bg-backgroundElevated border border-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-semibold text-textPrimary">Find Your Place</h2>
              <button
                onClick={() => { setShowSeekForm(false); setMapLocation(null); }}
                className="p-2 text-textMuted hover:text-textPrimary transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <SeekerForm
                initialLocality={mapLocation?.locality}
                onSubmit={handleSeekSubmit}
                onCancel={() => { setShowSeekForm(false); setMapLocation(null); }}
              />
            </div>
          </div>
        </div>
      )}
      */}
    </div>
  );
}
