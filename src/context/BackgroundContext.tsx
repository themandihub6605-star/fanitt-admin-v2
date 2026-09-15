import { createContext, useContext, useState, type PropsWithChildren } from 'react';

/** Every option is a real, verified, free-to-use image — either
 * fetched and confirmed live before being added here, or supplied
 * directly by the admin. `url: null` is the plain white/neutral
 * option — no photo at all, just the panel's normal background color. */
export interface BackgroundOption {
  id: string;
  label: string;
  /** Small preview shown in the picker swatch. */
  thumbnailUrl: string | null;
  /** Full-size image actually used behind the panel. Same as
   * thumbnailUrl for these presets, kept separate in case a lower-res
   * thumbnail is ever wanted. */
  url: string | null;
}

export const BACKGROUND_OPTIONS: BackgroundOption[] = [
  {
    id: 'white',
    label: 'White',
    thumbnailUrl: null,
    url: null,
  },
  {
    id: 'texture',
    label: 'Warm Texture',
    thumbnailUrl: 'https://cdn.pixabay.com/photo/2017/03/02/08/58/background-texture-2110724_1280.jpg',
    url: 'https://cdn.pixabay.com/photo/2017/03/02/08/58/background-texture-2110724_1280.jpg',
  },
  {
    id: 'pastel',
    label: 'Soft Pastel',
    thumbnailUrl:
      "https://images.unsplash.com/photo-1761888855526-674732099103?fm=jpg&q=60&w=600&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    url: "https://images.unsplash.com/photo-1761888855526-674732099103?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: 'blue-purple',
    label: 'Blue & Purple',
    thumbnailUrl:
      "https://images.unsplash.com/photo-1771846160864-cfb1b0d56b1d?fm=jpg&q=60&w=600&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    url: "https://images.unsplash.com/photo-1771846160864-cfb1b0d56b1d?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: 'warm-cool',
    label: 'Warm & Cool',
    thumbnailUrl:
      "https://images.unsplash.com/photo-1763652387504-c9ed66d86d02?fm=jpg&q=60&w=600&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    url: "https://images.unsplash.com/photo-1763652387504-c9ed66d86d02?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
];

interface BackgroundContextValue {
  backgroundId: string;
  background: BackgroundOption;
  setBackgroundId: (id: string) => void;
}

const BackgroundContext = createContext<BackgroundContextValue | null>(null);

const STORAGE_KEY = 'fanitt_admin_background';

/** Wraps the whole admin app — reads the saved background choice from
 * localStorage (falls back to the warm texture on first visit), and
 * persists any change. Mirrors ThemeProvider's pattern exactly. */
export function BackgroundProvider({ children }: PropsWithChildren) {
  const [backgroundId, setBackgroundIdState] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && BACKGROUND_OPTIONS.some((b) => b.id === saved)) return saved;
    return 'texture';
  });

  const setBackgroundId = (id: string) => {
    setBackgroundIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  };

  const background = BACKGROUND_OPTIONS.find((b) => b.id === backgroundId) || BACKGROUND_OPTIONS[0];

  return <BackgroundContext.Provider value={{ backgroundId, background, setBackgroundId }}>{children}</BackgroundContext.Provider>;
}

export function useBackground() {
  const ctx = useContext(BackgroundContext);
  if (!ctx) throw new Error('useBackground must be used within BackgroundProvider');
  return ctx;
}
