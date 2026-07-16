// src/app/map/page.tsx
// Main map page

'use client';

import { useState } from 'react';
import { MapComponent, PinBottomSheet, MapPin } from '@/components/Map';
import { ListingForm } from '@/components/forms/ListingForm';
import { SeekerForm } from '@/components/forms/SeekerForm';
import { ListingSubmit, SeekerSubmit } from '@/lib/schemas';

export default function MapPage() {
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);
  const [showListForm, setShowListForm] = useState(false);
  const [showSeekForm, setShowSeekForm] = useState(false);

  const handlePinClick = (pin: MapPin) => {
    setSelectedPin(pin);
  };

  const handleCloseSheet = () => {
    setSelectedPin(null);
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
      alert('Search submitted! Please check your email to verify.');
    } else {
      alert(result.error || 'Failed to submit search');
    }
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
          </div>
        </div>
      </header>

      {/* Map */}
      <main className="relative pt-16 h-[calc(100vh-4rem)]">
        <MapComponent
          onPinClick={handlePinClick}
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
          </div>
        </div>
      </main>

      {/* Pin Bottom Sheet */}
      <PinBottomSheet
        pin={selectedPin}
        onClose={handleCloseSheet}
        onAction={(action) => {
          if (action === 'view') {
            // Navigate to listing detail
            window.location.href = `/list/${selectedPin?.id}`;
          }
        }}
      />

      {/* Listing Form Modal */}
      {showListForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay">
          <div className="bg-backgroundElevated border border-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-semibold text-textPrimary">List Your Property</h2>
              <button
                onClick={() => setShowListForm(false)}
                className="p-2 text-textMuted hover:text-textPrimary transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <ListingForm onSubmit={handleListSubmit} onCancel={() => setShowListForm(false)} />
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
                onClick={() => setShowSeekForm(false)}
                className="p-2 text-textMuted hover:text-textPrimary transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <SeekerForm onSubmit={handleSeekSubmit} onCancel={() => setShowSeekForm(false)} />
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