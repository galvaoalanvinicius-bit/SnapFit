'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { BottomNav } from '@/components/BottomNav';
import type { Profile } from '@/lib/types';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const ACTIVITIES = [
  { type: 'Corrida', icon: '🏃', met: 9.8, color: '#f97316' },
  { type: 'Caminhada', icon: '🚶', met: 3.5, color: '#22c55e' },
  { type: 'Bicicleta', icon: '🚴', met: 7.5, color: '#3b82f6' },
  { type: 'Natação', icon: '🏊', met: 8.0, color: '#06b6d4' },
];

interface Coordinate {
  lat: number;
  lng: number;
  timestamp: number;
}

type ActivityStatus = 'idle' | 'active' | 'paused' | 'finished';

export default function AtividadePage() {
  const router = useRouter();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [status, setStatus] = useState<ActivityStatus>('idle');
  const [selectedActivity, setSelectedActivity] = useState(ACTIVITIES[0]);
  const [coordinates, setCoordinates] = useState<Coordinate[]>([]);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [calories, setCalories] = useState(0);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedActivity, setSavedActivity] = useState<any>(null);
  const [locationError, setLocationError] = useState('');
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [locating, setLocating] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setUserId(user.id);
      const { data: p } = await supabase
        .from('profiles').select('*').eq('id', user.id).single();
      setProfile(p);
    }
    load();
  }, [router]);

  // Obter localização atual ao abrir a página
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('GPS não disponível no seu dispositivo');
      setLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setLocating(false);
      },
      (err) => {
        setLocationError('Não foi possível obter sua localização. Verifique as permissões do GPS.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, []);

  // Inicializar mapa assim que a localização estiver disponível
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current || !userLocation) return;

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${process.env.NEXT_PUBLIC_MAPTILER_KEY}`,
      center: [userLocation.lng, userLocation.lat],
      zoom: 16,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Adicionar marcador na posição atual
    const el = document.createElement('div');
    el.style.cssText = `
      width: 16px; height: 16px; border-radius: 50%;
      background: #00d4ff;
      border: 3px solid white;
      box-shadow: 0 0 10px #00d4ff;
    `;
    new maplibregl.Marker({ element: el })
      .setLngLat([userLocation.lng, userLocation.lat])
      .addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [userLocation]);

  // Atualizar rota no mapa
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || coordinates.length < 2) return;

    const geojson: GeoJSON.Feature<GeoJSON.LineString> = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: coordinates.map(c => [c.lng, c.lat]),
      },
    };

    if (map.getSource('route')) {
      (map.getSource('route') as maplibregl.GeoJSONSource).setData(geojson);
    } else {
      map.addSource('route', { type: 'geojson', data: geojson });
      map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': selectedActivity.color,
          'line-width': 5,
          'line-opacity': 0.9,
        },
      });
    }
  }, [coordinates, selectedActivity.color]);

  // Timer
  useEffect(() => {
    if (status === 'active') {
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status]);

  // Calorias
  useEffect(() => {
    if (profile?.weight && duration > 0) {
      const burned = Math.round(
        selectedActivity.met * (profile.weight) * (duration / 3600)
      );
      setCalories(burned);
    }
  }, [duration, selectedActivity.met, profile?.weight]);

  function calcDistance(coords: Coordinate[]): number {
    if (coords.length < 2) return 0;
    let total = 0;
    for (let i = 1; i < coords.length; i++) {
      const R = 6371;
      const dLat = (coords[i].lat - coords[i-1].lat) * Math.PI / 180;
      const dLon = (coords[i].lng - coords[i-1].lng) * Math.PI / 180;
      const a = Math.sin(dLat/2) ** 2 +
        Math.cos(coords[i-1].lat * Math.PI / 180) *
        Math.cos(coords[i].lat * Math.PI / 180) *
        Math.sin(dLon/2) ** 2;
      total += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }
    return total;
  }

  function startActivity() {
    setStatus('active');
    setCoordinates([]);
    setDistance(0);
    setDuration(0);
    setCalories(0);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const newCoord: Coordinate = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          timestamp: pos.timestamp,
        };

        setCoordinates(prev => {
          const updated = [...prev, newCoord];
          const dist = calcDistance(updated);
          setDistance(dist);

          if (updated.length >= 2) {
            const last = updated[updated.length - 2];
            const timeDiff = (newCoord.timestamp - last.timestamp) / 1000;
            if (timeDiff > 0) {
              const lastDist = calcDistance([last, newCoord]);
              setCurrentSpeed((lastDist / timeDiff) * 3600);
            }
          }
          return updated;
        });

        const map = mapInstanceRef.current;
        if (map) {
          map.setCenter([pos.coords.longitude, pos.coords.latitude]);
          if (markerRef.current) {
            markerRef.current.setLngLat([pos.coords.longitude, pos.coords.latitude]);
          } else {
            const el = document.createElement('div');
            el.style.cssText = `
              width: 20px; height: 20px; border-radius: 50%;
              background: ${selectedActivity.color};
              border: 3px solid white;
              box-shadow: 0 0 12px ${selectedActivity.color};
            `;
            markerRef.current = new maplibregl.Marker({ element: el })
              .setLngLat([pos.coords.longitude, pos.coords.latitude])
              .addTo(map);
          }
        }
      },
      (err) => {
        setLocationError('Erro ao rastrear: ' + err.message);
        setStatus('idle');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 1000 }
    );
  }

  function pauseActivity() {
    setStatus('paused');
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
  }

  function resumeActivity() {
    setStatus('active');
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const newCoord: Coordinate = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          timestamp: pos.timestamp,
        };
        setCoordinates(prev => {
          const updated = [...prev, newCoord];
          setDistance(calcDistance(updated));
          return updated;
        });
        mapInstanceRef.current?.setCenter([pos.coords.longitude, pos.coords.latitude]);
        markerRef.current?.setLngLat([pos.coords.longitude, pos.coords.latitude]);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 1000 }
    );
  }

  function stopActivity() {
    setStatus('finished');
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    if (markerRef.current) { markerRef.current.remove(); markerRef.current = null; }
  }

  function handlePhoto(file: File) {
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function saveActivity() {
    if (!userId || !profile) return;
    setSaving(true);
    try {
      let photoUrl: string | null = null;
      if (photo) {
        const fileName = `${userId}/${Date.now()}.jpg`;
        const { data, error } = await supabase.storage
          .from('meal-images')
          .upload(fileName, photo, { contentType: 'image/jpeg' });
        if (!error && data) {
          const { data: urlData } = supabase.storage
            .from('meal-images').getPublicUrl(data.path);
          photoUrl = urlData.publicUrl;
        }
      }

      await supabase.from('activity_routes').insert({
        user_id: userId,
        activity_type: selectedActivity.type,
        distance_km: parseFloat(distance.toFixed(2)),
        duration_seconds: duration,
        calories_burned: calories,
        avg_pace: distance > 0 ? (duration / 60) / distance : null,
        coordinates: coordinates,
        photo_url: photoUrl,
        notes: notes || null,
        date: today,
      });

      await supabase.from('manual_activities').insert({
        user_id: userId,
        activity_type: selectedActivity.type,
        duration_minutes: Math.round(duration / 60),
        distance_km: parseFloat(distance.toFixed(2)),
        calories_burned: calories,
        date: today,
        notes: `${selectedActivity.icon} ${formatDistance(distance)} em ${formatTime(duration)}`,
      });

      setSavedActivity({
        activity_type: selectedActivity.type,
        distance_km: distance,
        duration_seconds: duration,
        calories_burned: calories,
        photo_url: photoUrl,
      });
    } catch (e: any) {
      console.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  function formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  }

  function formatDistance(km: number): string {
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${km.toFixed(2)}km`;
  }

  function formatPace(km: number, seconds: number): string {
    if (km === 0) return '--:--';
    const paceSeconds = seconds / km;
    const m = Math.floor(paceSeconds / 60);
    const s = Math.round(paceSeconds % 60);
    return `${m}:${s.toString().padStart(2,'0')}/km`;
  }

  if (savedActivity) return (
    <div className="min-h-screen bg-black pb-24">
      <div className="max-w-sm mx-auto p-5">
        <div className="pt-8 text-center mb-6">
          <div className="text-5xl mb-3">{selectedActivity.icon}</div>
          <h1 className="text-2xl font-bold text-white">Atividade salva! 🎉</h1>
          <p className="text-gray-400 text-sm mt-1">
            {savedActivity.calories_burned} kcal adicionadas ao seu diário
          </p>
        </div>

        {photoPreview && (
          <img src={photoPreview}
            className="w-full h-48 object-cover rounded-2xl mb-4" alt="Foto" />
        )}

        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { label: 'Distância', value: formatDistance(savedActivity.distance_km), color: 'text-cyan-400' },
            { label: 'Tempo', value: formatTime(savedActivity.duration_seconds), color: 'text-purple-400' },
            { label: 'Calorias', value: `${savedActivity.calories_burned} kcal`, color: 'text-orange-400' },
            { label: 'Pace médio', value: formatPace(savedActivity.distance_km, savedActivity.duration_seconds), color: 'text-green-400' },
          ].map(s => (
            <div key={s.label} className="glass-card rounded-xl p-4 text-center border border-gray-800">
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-gray-500 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <button onClick={() => router.push('/compartilhar')}
          className="neon-btn-orange w-full py-4 rounded-xl text-orange-400 font-bold mb-3">
          📱 Compartilhar atividade
        </button>
        <button onClick={() => {
          setSavedActivity(null); setPhotoPreview(null);
          setPhoto(null); setNotes(''); setStatus('idle');
          setDistance(0); setDuration(0); setCalories(0);
        }}
          className="w-full py-3 rounded-xl border border-gray-800 text-gray-400 text-sm">
          + Nova atividade
        </button>
      </div>
      <BottomNav active="treino" />
    </div>
  );

  return (
    <div className="min-h-screen bg-black pb-24">
      <div className="max-w-sm mx-auto">

        {/* Mapa */}
        <div style={{ height: '45vh', position: 'relative' }}>
          {locating ? (
            <div className="w-full h-full bg-gray-950 flex flex-col items-center justify-center gap-3">
              <div className="text-3xl animate-pulse">📍</div>
              <p className="text-gray-400 text-sm">Obtendo sua localização...</p>
            </div>
          ) : (
            <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
          )}

          {locationError && (
            <div className="absolute bottom-3 left-3 right-3 bg-red-950 border border-red-800 rounded-xl p-3">
              <p className="text-red-400 text-xs">{locationError}</p>
            </div>
          )}

          {(status === 'active' || status === 'paused') && (
            <div className="absolute top-3 left-3 right-3 flex gap-2">
              <div className="bg-black/80 rounded-xl px-3 py-2 text-center flex-1">
                <p className="text-cyan-400 font-black">{formatTime(duration)}</p>
                <p className="text-gray-600 text-xs">tempo</p>
              </div>
              <div className="bg-black/80 rounded-xl px-3 py-2 text-center flex-1">
                <p className="text-green-400 font-black">{formatDistance(distance)}</p>
                <p className="text-gray-600 text-xs">distância</p>
              </div>
              <div className="bg-black/80 rounded-xl px-3 py-2 text-center flex-1">
                <p className="text-orange-400 font-black">{calories}</p>
                <p className="text-gray-600 text-xs">kcal</p>
              </div>
            </div>
          )}
        </div>

        <div className="p-5">

          {/* Seletor — idle */}
          {status === 'idle' && (
            <>
              <p className="text-gray-400 text-sm font-semibold mb-3">Tipo de atividade</p>
              <div className="grid grid-cols-4 gap-2 mb-5">
                {ACTIVITIES.map(act => (
                  <button key={act.type} onClick={() => setSelectedActivity(act)}
                    className={`p-3 rounded-xl flex flex-col items-center gap-1 border transition-all ${
                      selectedActivity.type === act.type
                        ? 'border-cyan-400 bg-cyan-950/30'
                        : 'border-gray-800 bg-gray-950'
                    }`}>
                    <span className="text-2xl">{act.icon}</span>
                    <span className="text-xs text-gray-400">{act.type}</span>
                  </button>
                ))}
              </div>

              <button
                onClick={startActivity}
                disabled={locating || !!locationError}
                className="neon-btn-orange w-full py-5 rounded-2xl text-orange-400 font-black text-xl disabled:opacity-40">
                {locating ? '📍 Aguardando GPS...' : `${selectedActivity.icon} Iniciar ${selectedActivity.type}`}
              </button>
            </>
          )}

          {/* Controles — ativo/pausado */}
          {(status === 'active' || status === 'paused') && (
            <>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="glass-card rounded-xl p-3 text-center border border-gray-800">
                  <p className="text-purple-400 font-bold">{formatPace(distance, duration)}</p>
                  <p className="text-gray-500 text-xs">Pace médio</p>
                </div>
                <div className="glass-card rounded-xl p-3 text-center border border-gray-800">
                  <p className="text-yellow-400 font-bold">{currentSpeed.toFixed(1)} km/h</p>
                  <p className="text-gray-500 text-xs">Velocidade</p>
                </div>
              </div>
              <div className="flex gap-3">
                {status === 'active' ? (
                  <button onClick={pauseActivity}
                    className="flex-1 py-4 rounded-xl border border-yellow-800 text-yellow-400 font-bold text-lg">
                    ⏸️ Pausar
                  </button>
                ) : (
                  <button onClick={resumeActivity}
                    className="flex-1 py-4 rounded-xl border border-green-800 text-green-400 font-bold text-lg">
                    ▶️ Continuar
                  </button>
                )}
                <button onClick={stopActivity}
                  className="flex-1 py-4 rounded-xl bg-red-950 border border-red-800 text-red-400 font-bold text-lg">
                  ⏹️ Parar
                </button>
              </div>
            </>
          )}

          {/* Finalização */}
          {status === 'finished' && (
            <>
              <h2 className="text-white font-bold text-lg mb-4">
                {selectedActivity.icon} Atividade finalizada!
              </h2>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { label: 'Distância', value: formatDistance(distance), color: 'text-cyan-400' },
                  { label: 'Tempo total', value: formatTime(duration), color: 'text-purple-400' },
                  { label: 'Calorias', value: `${calories} kcal`, color: 'text-orange-400' },
                  { label: 'Pace médio', value: formatPace(distance, duration), color: 'text-green-400' },
                ].map(s => (
                  <div key={s.label} className="glass-card rounded-xl p-4 text-center border border-gray-800">
                    <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                    <p className="text-gray-500 text-xs mt-1">{s.label}</p>
                  </div>
                ))}
              </div>

              <input ref={fileRef as any} type="file" accept="image/*"
                capture="environment" className="hidden"
                onChange={e => e.target.files?.[0] && handlePhoto(e.target.files[0])} />

              {photoPreview ? (
                <div className="relative mb-4">
                  <img src={photoPreview} className="w-full h-40 object-cover rounded-xl" alt="" />
                  <button onClick={() => { setPhoto(null); setPhotoPreview(null); }}
                    className="absolute top-2 right-2 bg-black/70 text-white rounded-full w-8 h-8 flex items-center justify-center">✕</button>
                </div>
              ) : (
                <button onClick={() => (fileRef.current as any)?.click()}
                  className="w-full border border-gray-800 rounded-xl py-4 text-gray-400 text-sm mb-4 flex items-center justify-center gap-2">
                  📷 Adicionar foto do percurso
                </button>
              )}

              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Como foi sua atividade?" rows={2}
                className="w-full mb-4" style={{ borderRadius: '12px', padding: '12px 16px' }} />

              <button onClick={saveActivity} disabled={saving}
                className="neon-btn-orange w-full py-4 rounded-xl text-orange-400 font-bold disabled:opacity-50">
                {saving ? 'Salvando...' : '✅ Salvar atividade'}
              </button>
            </>
          )}
        </div>
      </div>
      <BottomNav active="treino" />
    </div>
  );
}