
import { EqualizerConfig } from '../types';

export const EQ_FREQUENCIES = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];

export const EQ_PRESETS: { id: string, label: string, bands: number[] }[] = [
    { id: 'flat', label: 'FLAT', bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { id: 'bass', label: 'BASS BOOST', bands: [9, 7, 5, 2, 0, 0, 0, 0, 0, 0] },
    { id: 'rock', label: 'ROCK', bands: [5, 3, 0, -2, -3, -2, 0, 2, 4, 5] },
    { id: 'pop', label: 'POP', bands: [-2, -1, 0, 2, 4, 4, 2, 0, -1, -2] },
    { id: 'jazz', label: 'JAZZ', bands: [4, 2, 0, -2, -2, -2, 0, 2, 3, 4] },
    { id: 'classical', label: 'CLASSICAL', bands: [5, 3, 2, 0, 0, 0, 0, 2, 3, 4] },
    { id: 'techno', label: 'TECHNO', bands: [6, 5, 3, 0, -2, 0, 2, 4, 5, 5] },
    { id: 'voice', label: 'VOICE', bands: [-3, -3, -2, 0, 4, 5, 4, 1, -1, -3] },
    { id: 'lofi', label: 'LO-FI', bands: [2, 1, 0, -2, -5, -8, -12, -12, -12, -12] },
];
