import { lazy, Suspense } from 'react';
import type { MapViewProps } from './MapCanvas';

const MapCanvas = lazy(() => import('./MapCanvas'));

export function MapView(props: MapViewProps) {
  return <Suspense fallback={<div className={`map-view ${props.full ? 'map-view-full' : ''} map-loading`} role="status">Loading the map…</div>}><MapCanvas {...props} /></Suspense>;
}
