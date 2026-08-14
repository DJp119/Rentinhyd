// src/components/map/MapLayerNavigation.tsx
// Top-right compact map layer toggles and navigation links

'use client';

// import Link from 'next/link';

export type MapLayerNavigationProps = {
  rentPinsVisible: boolean;
  toLetBoardsVisible: boolean;
  onToggleRentPins: () => void;
  onToggleToLetBoards: () => void;
  className?: string;
};

export function MapLayerNavigation({
  rentPinsVisible,
  toLetBoardsVisible,
  onToggleRentPins,
  onToggleToLetBoards,
  className = '',
}: MapLayerNavigationProps) {
  return (
    <nav
      aria-label="Map layers"
      data-testid="map-navigation"
      onClick={(e) => e.stopPropagation()}
      className={`map-control-surface inline-flex items-center gap-1.5 p-1.5 rounded-xl text-xs sm:text-sm font-medium max-w-[calc(100vw-2rem)] overflow-x-auto shadow-lg select-none scrollbar-none ${className}`}
      style={{
        zIndex: 'var(--z-map-navigation, 40)',
      }}
    >
      {/* Layer Toggle: Rent Pins */}
      <button
        type="button"
        onClick={onToggleRentPins}
        aria-pressed={rentPinsVisible}
        data-testid="rent-pins-toggle"
        className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg transition-all duration-150 whitespace-nowrap cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent ${
          rentPinsVisible
            ? 'bg-accent/20 text-accent font-semibold border border-accent/40 shadow-xs'
            : 'text-textMuted hover:text-textSecondary hover:bg-backgroundHover/60 border border-transparent opacity-65'
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full transition-opacity ${
            rentPinsVisible ? 'bg-accent' : 'bg-textMuted'
          }`}
          aria-hidden="true"
        />
        <span>Rent Pins</span>
      </button>

      {/* Nav Link: Whole Flats (Temporarily disabled)
      <Link
        href="/flats-for-rent-in-hyderabad"
        className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-textSecondary hover:text-textPrimary hover:bg-backgroundHover/60 border border-transparent transition-colors whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-accent"
        title="View Whole Flats in Hyderabad"
      >
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: '#E8A838' }}
          aria-hidden="true"
        />
        <span>Whole Flats</span>
      </Link>
      */}

      {/* Nav Link: Rooms (Temporarily disabled)
      <Link
        href="/flatmates-in-hyderabad"
        className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-textSecondary hover:text-textPrimary hover:bg-backgroundHover/60 border border-transparent transition-colors whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-accent"
        title="Find flatmates and rooms in Hyderabad"
      >
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: '#4FC3F7' }}
          aria-hidden="true"
        />
        <span>Rooms</span>
      </Link>
      */}

      {/* Layer Toggle: To-Let Boards */}
      <button
        type="button"
        onClick={onToggleToLetBoards}
        aria-pressed={toLetBoardsVisible}
        data-testid="tolet-boards-toggle"
        className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg transition-all duration-150 whitespace-nowrap cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent ${
          toLetBoardsVisible
            ? 'bg-[#9C27B0]/20 text-[#CE93D8] font-semibold border border-[#9C27B0]/50 shadow-xs'
            : 'text-textMuted hover:text-textSecondary hover:bg-backgroundHover/60 border border-transparent opacity-65'
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full transition-opacity ${
            toLetBoardsVisible ? 'bg-[#9C27B0]' : 'bg-textMuted'
          }`}
          aria-hidden="true"
        />
        <span>To-Let Boards</span>
      </button>
    </nav>
  );
}
