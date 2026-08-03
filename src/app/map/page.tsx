// src/app/map/page.tsx
// Main map page

'use client';

import { useState, useCallback } from 'react';
import { MapComponent, PinBottomSheet, MapPin, MapLocation } from '@/components/Map';
import { MapAddMenu } from '@/components/MapAddMenu';
import { ListingForm } from '@/components/forms/ListingForm';
import { SeekerForm } from '@/components/forms/SeekerForm';
import { RentPinForm } from '@/components/forms/RentPinForm';
import { ToLetBoardForm } from '@/components/forms/ToLetBoardForm';
import { ToLetBoardSheet } from '@/components/ToLetBoardSheet';
import { ListingSubmit, SeekerSubmit, RentPinSubmit } from '@/lib/schemas';
import { ConsentModal } from '@/components/ConsentModal';

export default function MapPage() {
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);
  const [selectedToLetId, setSelectedToLetId] = useState<string | null>(null);
  const [showListForm, setShowListForm] = useState(false);
  const [showSeekForm, setShowSeekForm] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // States for Map Tap flow
  const [mapLocation, setMapLocation] = useState<MapLocation | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showRentForm, setShowRentForm] = useState(false);
  const [showToLetForm, setShowToLetForm] = useState(false);

  const handlePinClick = useCallback((pin: MapPin) => {
    if (!consentGiven) return;
    if (pin.type === 'tolet_board') {
      setSelectedToLetId(pin.id);
    } else {
      setSelectedPin(pin);
    }
  }, [consentGiven]);

  const handleMapClick = useCallback((location: MapLocation) => {
    if (!consentGiven) return;
    setMapLocation(location);
    setShowAddMenu(true);
  }, [consentGiven]);

  const handleAddRent = useCallback(() => {
    setShowAddMenu(false);
    setShowRentForm(true);
  }, []);

  const handleAddListing = useCallback(() => {
    setShowAddMenu(false);
    setShowListForm(true);
  }, []);

  const handleAddSeeker = useCallback(() => {
    setShowAddMenu(false);
    setShowSeekForm(true);
  }, []);

  const handleAddToLet = useCallback(() => {
    setShowAddMenu(false);
    setShowToLetForm(true);
  }, []);

  const handleCloseAddMenu = useCallback(() => {
    setShowAddMenu(false);
    setMapLocation(null);
  }, []);

  const handleShareMap = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'hyderabad.rent — Rental Map', url });
        return;
      } catch {
        // User cancelled or share failed
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      // Clipboard failed silently
    }
  };

  const handleCloseSheet = useCallback(() => {
    setSelectedPin(null);
    setSelectedToLetId(null);
  }, []);

  const handleRentSubmit = async (data: RentPinSubmit) => {
    const response = await fetch('/api/rent-pins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (result.id) {
      setShowRentForm(false);
      setMapLocation(null);
      alert('Rent pin submitted! It will appear on the map after moderation.');
    } else {
      alert(result.error || 'Failed to submit rent pin');
    }
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

  const handleToLetSuccess = () => {
    setShowToLetForm(false);
    setMapLocation(null);
    alert('To-Let board submitted for moderation!');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 text-accent" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            <span className="text-xl font-bold text-textPrimary">hyderabad.rent</span>
          </div>

          <nav className="hidden md:flex items-center gap-4">
            <a href="/flats-for-rent-in-hyderabad" className="text-sm text-textSecondary hover:text-textPrimary transition-colors">
              Flats for Rent
            </a>
            <a href="/flatmates-in-hyderabad" className="text-sm text-textSecondary hover:text-textPrimary transition-colors">
              Flatmates
            </a>
            <a href="/rent-map" className="text-sm text-accent font-medium">Map</a>
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowListForm(true)}
              className="hidden sm:block px-4 py-2 bg-accent text-background font-medium rounded-lg hover:bg-accentHover transition-colors"
            >
              List Property
            </button>
            <button
              onClick={() => setShowSeekForm(true)}
              className="px-4 py-2 border border-border text-textSecondary rounded-lg hover:border-accent hover:text-textPrimary transition-colors"
            >
              Find Place
            </button>
            <button
              onClick={handleShareMap}
              className="p-2 text-textSecondary hover:text-textPrimary transition-colors"
              aria-label="Share map"
              data-testid="share-map-button"
            >
              {shareCopied ? (
                <span className="text-xs text-accent font-medium">Copied</span>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Map */}
      <main className="relative pt-16 h-[calc(100vh-4rem)]">
        <MapComponent
          onPinClick={handlePinClick}
          onMapClick={handleMapClick}
          className="w-full h-full"
        />

        {/* Floating Actions - Mobile */}
        <div className="sm:hidden fixed bottom-4 left-4 right-4 z-30 flex gap-2">
          <button
            onClick={() => setShowListForm(true)}
            className="flex-1 btn-primary"
          >
            List Property
          </button>
          <button
            onClick={() => setShowSeekForm(true)}
            className="flex-1 btn-secondary"
          >
            Find Place
          </button>
        </div>

        {/* Stats Overlay */}
        <div className="absolute top-20 left-4 z-20 bg-backgroundElevated/95 backdrop-blur border border-border rounded-lg p-3 shadow-lg">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-accent"></span>
              <span className="text-textSecondary">Rent Pins</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#E8A838' }}></span>
              <span className="text-textSecondary">Whole Flats</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#4FC3F7' }}></span>
              <span className="text-textSecondary">Rooms</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#9C27B0' }}></span>
              <span className="text-textSecondary">To-Let Boards</span>
            </div>
          </div>
        </div>
      </main>

      {/* Map Add Menu */}
      {showAddMenu && (
        <MapAddMenu
          location={mapLocation}
          onClose={handleCloseAddMenu}
          onRent={handleAddRent}
          onList={handleAddListing}
          onSeek={handleAddSeeker}
          onToLet={handleAddToLet}
        />
      )}

      {/* Rent Pin Form Modal */}
      {showRentForm && mapLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay">
          <div className="bg-backgroundElevated border border-border rounded-xl max-w-xl w-full max-h-[90vh] overflow-y-auto animate-slide-up p-6">
            <div className="border-b border-border pb-4 mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-textPrimary">💰 What rent are you paying?</h2>
              <button
                onClick={() => { setShowRentForm(false); setMapLocation(null); }}
                className="p-2 text-textMuted hover:text-textPrimary transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <RentPinForm
              location={mapLocation}
              onSubmit={handleRentSubmit}
              onCancel={() => { setShowRentForm(false); setMapLocation(null); }}
            />
          </div>
        </div>
      )}

      {/* To-Let Board Form Modal */}
      {showToLetForm && mapLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay">
          <div className="bg-backgroundElevated border border-border rounded-xl max-w-xl w-full max-h-[90vh] overflow-y-auto animate-slide-up p-6">
            <div className="border-b border-border pb-4 mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-textPrimary">🪧 Spotted a To-Let board?</h2>
              <button
                onClick={() => { setShowToLetForm(false); setMapLocation(null); }}
                className="p-2 text-textMuted hover:text-textPrimary transition-colors"
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

      {/* Pin Bottom Sheet (Rent pins / Listings) */}
      <PinBottomSheet
        pin={selectedPin}
        onClose={handleCloseSheet}
        onAction={(action) => {
          if (action === 'view') {
            window.location.href = `/list/${selectedPin?.id}`;
          }
        }}
      />

      {/* To-Let Board Detail Sheet */}
      {selectedToLetId && (
        <ToLetBoardSheet
          id={selectedToLetId}
          onClose={handleCloseSheet}
        />
      )}

      {/* Consent Modal */}
      <ConsentModal onAccept={() => setConsentGiven(true)} />

      {/* Listing Form Modal */}
      {showListForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay">
          <div className="bg-backgroundElevated border border-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-semibold text-textPrimary">List Your Property</h2>
              <button
                onClick={() => { setShowListForm(false); setMapLocation(null); }}
                className="p-2 text-textMuted hover:text-textPrimary transition-colors"
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

      {/* Seeker Form Modal */}
      {showSeekForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay">
          <div className="bg-backgroundElevated border border-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-semibold text-textPrimary">Find Your Place</h2>
              <button
                onClick={() => { setShowSeekForm(false); setMapLocation(null); }}
                className="p-2 text-textMuted hover:text-textPrimary transition-colors"
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

      {/* Footer */}
      <footer className="bg-backgroundElevated border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-textMuted text-sm">
          <p>hyderabad.rent — Zero brokerage rental marketplace</p>
          <p className="mt-1">
            <a href="/privacy" className="text-accent hover:underline mr-4">Privacy</a>
            <a href="/terms" className="text-accent hover:underline mr-4">Terms</a>
            <a href="/consent" className="text-accent hover:underline">Consent</a>
          </p>
        </div>
      </footer>
    </div>
  );
}