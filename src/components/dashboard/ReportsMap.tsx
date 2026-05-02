import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as L from 'leaflet'
import reportService from '../../services/reportService'
import type { ReportPinsResult, ReportStatus } from '../../types/report'
import { getApiErrorMessage } from '../../utils/apiResponse'

interface ReportsMapProps {
  selectedReportId?: string | null
  onSelectReport: (reportId: string) => void
  initialCenter?: L.LatLngExpression
  initialZoom?: number
}

const DEFAULT_CENTER: L.LatLngExpression = [30.0444, 31.2357]
const DEFAULT_ZOOM = 15
const FETCH_DEBOUNCE_MS = 250
const DEFAULT_ERROR_MESSAGE = 'تعذر تحميل البلاغات على الخريطة.'
const GEOLOCATION_TIMEOUT_MS = 4500
const GEOLOCATION_MAX_AGE_MS = 60_000

const STATUS_CLASS_MAP: Record<ReportStatus, string> = {
  ai_review: 'report-map-marker--ai-review',
  human_review: 'report-map-marker--human-review',
  pending: 'report-map-marker--pending',
  in_progress: 'report-map-marker--in-progress',
  resolved: 'report-map-marker--resolved',
}

const STATUS_LEGEND: Array<{ key: string; className: string; label: string }> = [
  { key: 'resolved', className: STATUS_CLASS_MAP.resolved, label: 'تم الحل' },
  { key: 'in_progress', className: STATUS_CLASS_MAP.in_progress, label: 'قيد التنفيذ' },
  { key: 'pending', className: STATUS_CLASS_MAP.pending, label: 'معتمد وجاهز للتنفيذ' },
  { key: 'human_review', className: STATUS_CLASS_MAP.human_review, label: 'مراجعة بشرية' },
  { key: 'ai_review', className: STATUS_CLASS_MAP.ai_review, label: 'مراجعة الذكاء' },
]

const createPinIcon = (status: ReportStatus, isActive: boolean) => {
  return L.divIcon({
    className: `report-map-marker ${STATUS_CLASS_MAP[status]}${isActive ? ' report-map-marker--active' : ''}`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
}

const createClusterIcon = (count: number) => {
  return L.divIcon({
    className: 'report-map-cluster',
    html: String(count),
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  })
}

const resolveInitialZoom = (zoom: number | undefined) => {
  if (typeof zoom === 'number' && Number.isFinite(zoom)) {
    return Math.max(1, Math.round(zoom))
  }

  return DEFAULT_ZOOM
}

const ReportsMap = ({
  selectedReportId,
  onSelectReport,
  initialCenter,
  initialZoom,
}: ReportsMapProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersLayerRef = useRef<L.LayerGroup | null>(null)
  const debounceRef = useRef<number | null>(null)
  const requestIdRef = useRef(0)
  const isMountedRef = useRef(true)

  const [pinsResult, setPinsResult] = useState<ReportPinsResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const fetchPins = useCallback(async () => {
    const map = mapRef.current
    if (!map) {
      return
    }

    const bounds = map.getBounds()
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    setIsLoading(true)
    setErrorMessage(null)

    try {
      const nextResult = await reportService.listReportPins({
        minLat: bounds.getSouth(),
        maxLat: bounds.getNorth(),
        minLng: bounds.getWest(),
        maxLng: bounds.getEast(),
        scale: Math.round(map.getZoom()),
      })

      if (!isMountedRef.current || requestIdRef.current !== requestId) {
        return
      }

      setPinsResult(nextResult)
    } catch (error) {
      if (!isMountedRef.current || requestIdRef.current !== requestId) {
        return
      }

      setPinsResult(null)
      setErrorMessage(getApiErrorMessage(error, DEFAULT_ERROR_MESSAGE))
    } finally {
      if (isMountedRef.current && requestIdRef.current === requestId) {
        setIsLoading(false)
      }
    }
  }, [])

  const scheduleFetch = useCallback(() => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current)
    }

    debounceRef.current = window.setTimeout(() => {
      void fetchPins()
    }, FETCH_DEBOUNCE_MS)
  }, [fetchPins])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return
    }

    isMountedRef.current = true

    const resolvedCenter = initialCenter ?? DEFAULT_CENTER
    const resolvedZoom = resolveInitialZoom(initialZoom)

    const map = L.map(containerRef.current, {
      zoomControl: true,
      preferCanvas: true,
      zoomSnap: 1,
    })

    map.setView(resolvedCenter, resolvedZoom)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)

    const markersLayer = L.layerGroup().addTo(map)

    mapRef.current = map
    markersLayerRef.current = markersLayer

    const handleViewportChange = () => {
      scheduleFetch()
    }

    map.on('moveend', handleViewportChange)
    map.on('zoomend', handleViewportChange)

    if (!initialCenter && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!isMountedRef.current || !mapRef.current) {
            return
          }

          mapRef.current.setView(
            [position.coords.latitude, position.coords.longitude],
            resolvedZoom,
          )
        },
        () => {
          // Keep the fallback center when geolocation is unavailable.
        },
        {
          enableHighAccuracy: false,
          timeout: GEOLOCATION_TIMEOUT_MS,
          maximumAge: GEOLOCATION_MAX_AGE_MS,
        },
      )
    }

    void fetchPins()

    window.setTimeout(() => {
      map.invalidateSize()
    }, 0)

    return () => {
      isMountedRef.current = false
      requestIdRef.current += 1

      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current)
      }

      map.off('moveend', handleViewportChange)
      map.off('zoomend', handleViewportChange)
      map.remove()
      mapRef.current = null
      markersLayerRef.current = null
    }
  }, [fetchPins, initialCenter, initialZoom, scheduleFetch])

  useEffect(() => {
    if (!mapRef.current || !initialCenter) {
      return
    }

    const nextZoom = resolveInitialZoom(initialZoom)
    mapRef.current.setView(initialCenter, nextZoom)
  }, [initialCenter, initialZoom])

  useEffect(() => {
    const markersLayer = markersLayerRef.current

    if (!markersLayer) {
      return
    }

    markersLayer.clearLayers()

    if (!pinsResult) {
      return
    }

    if (pinsResult.mode === 'pins') {
      pinsResult.pins.forEach((pin) => {
        const marker = L.marker([pin.lat, pin.lng], {
          icon: createPinIcon(pin.status, pin.id === selectedReportId),
          riseOnHover: true,
        })

        marker.on('click', () => {
          onSelectReport(pin.id)
        })

        markersLayer.addLayer(marker)
      })

      return
    }

    pinsResult.clusters.forEach((cluster) => {
      const marker = L.marker([cluster.lat, cluster.lng], {
        icon: createClusterIcon(cluster.count),
        riseOnHover: true,
      })

      marker.on('click', () => {
        const map = mapRef.current
        if (!map) {
          return
        }

        const nextZoom = Math.min(map.getZoom() + 2, 18)
        map.setView([cluster.lat, cluster.lng], nextZoom)
      })

      markersLayer.addLayer(marker)
    })
  }, [onSelectReport, pinsResult, selectedReportId])

  const totalCount = useMemo(() => {
    if (!pinsResult) {
      return 0
    }

    if (pinsResult.mode === 'pins') {
      return pinsResult.pins.length
    }

    return pinsResult.total
  }, [pinsResult])

  const totalCountLabel = pinsResult ? String(totalCount) : '...'

  const statusHint = useMemo(() => {
    if (!pinsResult) {
      return null
    }

    if (pinsResult.mode === 'clusters') {
      return 'قم بالتقريب لرؤية البلاغات الفردية.'
    }

    return 'انقر على أي علامة لعرض ملخص البلاغ.'
  }, [pinsResult])

  return (
    <section
      dir="rtl"
      className="relative flex min-h-[520px] flex-1 flex-col overflow-hidden rounded-3xl border border-slate-200/70 bg-white/72 shadow-[0_20px_44px_rgba(15,23,42,0.1)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/68 dark:shadow-[0_30px_75px_rgba(2,6,23,0.5)]"
    >
      <div className="relative flex-1">
        <div ref={containerRef} className="absolute inset-0" aria-label="خريطة البلاغات" />

        <div className="pointer-events-none absolute inset-0 z-[1001]">
          <div className="absolute left-4 top-4 max-w-[280px] space-y-2">
            <div className="rounded-2xl border border-slate-200/70 bg-white/90 px-3 py-2 text-xs text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-200">
              <p className="text-sm font-bold">الخريطة الذكية للبلاغات</p>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-300">
                استعراض البلاغات حسب الموقع مع تحديث مباشر.
              </p>
              <div className="mt-2 flex items-center gap-2 text-[11px] font-semibold">
                <span className="text-slate-500 dark:text-slate-300">عدد البلاغات:</span>
                <span className="text-slate-900 dark:text-white">{totalCountLabel}</span>
              </div>
              {statusHint ? (
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-300">
                  {statusHint}
                </p>
              ) : null}
            </div>

            {isLoading ? (
              <div className="rounded-2xl border border-amber-200/70 bg-amber-50/90 px-3 py-2 text-xs font-semibold text-amber-700 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-200">
                جاري تحديث الخريطة...
              </div>
            ) : null}

            {errorMessage ? (
              <div className="rounded-2xl border border-rose-200/70 bg-rose-50/90 px-3 py-2 text-xs font-semibold text-rose-700 shadow-sm dark:border-rose-400/40 dark:bg-rose-500/20 dark:text-rose-100">
                {errorMessage}
              </div>
            ) : null}
          </div>

          <div className="report-map-legend absolute bottom-4 left-4 z-[1002] rounded-2xl border border-slate-200/70 bg-white/90 px-3 py-2 text-xs text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-200">
            <p className="mb-2 text-[11px] font-semibold text-slate-500 dark:text-slate-300">دلالة الألوان</p>
            <div className="grid gap-1.5">
              {STATUS_LEGEND.map((item) => (
                <div key={item.key} className="flex items-center gap-2">
                  <span className={`report-map-legend-dot ${item.className}`} />
                  <span className="text-[11px] font-semibold">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ReportsMap
