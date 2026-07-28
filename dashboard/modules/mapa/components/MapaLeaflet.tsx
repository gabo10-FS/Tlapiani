"use client";
// MapaLeaflet — carga dinámica (no SSR)
// GSAP: pulse repeat:-1 en marcadores críticos
// Marcadores como DivIcon → DOM real → GSAP puede animarlos

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import gsap from "gsap";
import type { ComunidadUrgencia } from "../types/urgencia.types";

gsap.registerPlugin();

const COLOR_MAP: Record<string, string> = {
  critica: "#EF4444",
  alta:    "#F97316",
  media:   "#F59E0B",
  baja:    "#10B981",
  segura:  "#059669",
};

const RADIUS_MAP: Record<string, number> = {
  critica: 14, alta: 11, media: 9, baja: 8, segura: 7,
};

interface Props {
  comunidades: ComunidadUrgencia[];
  onSelectComunidad: (c: ComunidadUrgencia) => void;
  comunidadSeleccionada: ComunidadUrgencia | null;
}

// Componente interno que accede al contexto del mapa
function Markers({ comunidades, onSelectComunidad, comunidadSeleccionada }: Props) {
  const map = useMap();
  const markersRef = useRef<L.Marker[]>([]);
  const gsapCtx   = useRef<gsap.Context | null>(null);

  useEffect(() => {
    // Cleanup de markers anteriores
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Cleanup de animaciones GSAP anteriores
    gsapCtx.current?.revert();
    gsapCtx.current = gsap.context(() => {});

    comunidades.forEach((com) => {
      const color   = COLOR_MAP[com.nivelUrgencia];
      const radius  = RADIUS_MAP[com.nivelUrgencia];
      const esSel   = comunidadSeleccionada?.id === com.id;
      const esCrit  = com.nivelUrgencia === "critica";
      const size    = radius * 2;

      // DivIcon → DOM real para que GSAP pueda animarlo
      const icon = L.divIcon({
        className: "",
        iconSize:   [size + 16, size + 16],
        iconAnchor: [(size + 16) / 2, (size + 16) / 2],
        html: `
          <div
            class="tlapiani-marker"
            data-id="${com.id}"
            data-nivel="${com.nivelUrgencia}"
            style="width:${size + 16}px;height:${size + 16}px;position:relative;display:flex;align-items:center;justify-content:center;cursor:pointer"
          >
            ${esCrit ? `
              <div class="pulse-ring-outer" style="
                position:absolute;
                width:${size + 14}px;height:${size + 14}px;
                border:1px solid ${color};
                border-radius:50%;
                opacity:0;
              "></div>
              <div class="pulse-ring-inner" style="
                position:absolute;
                width:${size + 6}px;height:${size + 6}px;
                border:1.5px solid ${color};
                border-radius:50%;
                opacity:0;
              "></div>
            ` : ""}
            <div class="marker-core" style="
              width:${size}px;height:${size}px;
              background:${color};
              border-radius:50%;
              border:${esSel ? "2px solid #fff" : `1.5px solid ${color}88`};
              opacity:0.9;
            "></div>
          </div>
        `,
      });

      const marker = L.marker([com.lat, com.lng], { icon })
        .addTo(map)
        .on("click", () => onSelectComunidad(com));

      markersRef.current.push(marker);
    });

    // GSAP: pulse repeat:-1 en marcadores críticos
    // Esperar un tick para que Leaflet renderice los DOM elements
    const timeout = setTimeout(() => {
      gsapCtx.current = gsap.context(() => {
        document.querySelectorAll("[data-nivel='critica'] .pulse-ring-outer").forEach((el) => {
          gsap.to(el, {
            scale: 1.6,
            opacity: 0,
            duration: 1.4,
            repeat: -1,         // GSAP: loop infinito
            ease: "power1.out",
            transformOrigin: "center center",
          });
        });
        document.querySelectorAll("[data-nivel='critica'] .pulse-ring-inner").forEach((el) => {
          gsap.to(el, {
            scale: 1.3,
            opacity: 0,
            duration: 1.4,
            repeat: -1,
            delay: 0.35,        // desfase para el segundo anillo
            ease: "power1.out",
            transformOrigin: "center center",
          });
        });
        // GSAP: núcleo del marcador crítico — pulso suave de opacidad
        document.querySelectorAll("[data-nivel='critica'] .marker-core").forEach((el) => {
          gsap.to(el, {
            opacity: 0.6,
            duration: 0.9,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
          });
        });
      });
    }, 100);

    return () => {
      clearTimeout(timeout);
      markersRef.current.forEach((m) => m.remove());
      gsapCtx.current?.revert();
    };
  }, [comunidades, comunidadSeleccionada, map, onSelectComunidad]);

  return null;
}

export default function MapaLeaflet(props: Props) {
  return (
    <MapContainer
      center={[23.6345, -102.5528]}
      zoom={5}
      className="h-full w-full"
      zoomControl={true}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='© OpenStreetMap © CARTO'
        maxZoom={19}
      />
      <Markers {...props} />
    </MapContainer>
  );
}
