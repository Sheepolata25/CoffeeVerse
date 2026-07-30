import { Component, inject, signal, computed, effect, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { RoasterService } from '../../core/services/roaster.service';
import { ProfileService } from '../../core/services/profile.service';
import { Roaster } from '../../core/models/roaster.model';

type SidebarView = 'list' | 'submit' | 'admin';

@Component({
  selector: 'app-map-page',
  imports: [FormsModule, DatePipe],
  templateUrl: './map.html',
})
export class MapPage implements AfterViewInit, OnDestroy {
  @ViewChild('mapEl') mapEl!: ElementRef<HTMLDivElement>;

  private roasterService = inject(RoasterService);
  private profileService = inject(ProfileService);

  profile = this.profileService.profile;
  isAdmin = computed(() => this.profile()?.is_admin ?? false);

  pending = this.roasterService.pending;

  sidebarView = signal<SidebarView>('list');
  searchQuery = signal('');
  selectedRoaster = signal<Roaster | null>(null);

  importing = signal(false);
  importMessage = signal<string | null>(null);

  placingPin = signal(false);
  newLat = signal<number | null>(null);
  newLng = signal<number | null>(null);
  submitting = signal(false);
  submitSuccess = signal(false);
  submitError = signal<string | null>(null);

  newName = '';
  newCountry = '';
  newCity = '';
  newWebsite = '';
  newDescription = '';

  geocodeQuery = '';
  geocodeResults = signal<any[]>([]);
  geocoding = signal(false);
  geocodeOpen = signal(false);

  filteredRoasters = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.roasterService.approved();
    return this.roasterService.approved().filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.city?.toLowerCase().includes(q) ||
      r.country?.toLowerCase().includes(q)
    );
  });

  private map!: L.Map;
  private markersLayer!: L.LayerGroup;
  private pinMarker: L.Marker | null = null;
  private markerMap = new Map<string, L.Marker>();
  private mapReady = signal(false);

  constructor() {
    effect(() => {
      if (this.mapReady()) {
        this.updateMarkers(this.filteredRoasters());
      }
    });
  }

  async ngAfterViewInit() {
    this.initMap();
    setTimeout(() => this.map.invalidateSize(), 0);
    await this.roasterService.loadApproved();
    if (this.isAdmin()) await this.roasterService.loadPending();
    this.mapReady.set(true);
  }

  ngOnDestroy() {
    this.map?.remove();
  }

  private initMap() {
    this.map = L.map(this.mapEl.nativeElement, {
      center: [20, 0],
      zoom: 2,
      zoomControl: false,
      maxBounds: [[-90, -180], [90, 180]],
      maxBoundsViscosity: 1.0,
    });

    L.control.zoom({ position: 'topright' }).addTo(this.map);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CartoDB</a>',
      subdomains: 'abcd',
      maxZoom: 19,
      noWrap: true,
    }).addTo(this.map);

    this.markersLayer = L.layerGroup().addTo(this.map);

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      if (!this.placingPin()) return;
      this.newLat.set(e.latlng.lat);
      this.newLng.set(e.latlng.lng);
      if (this.pinMarker) this.pinMarker.remove();
      this.pinMarker = L.marker([e.latlng.lat, e.latlng.lng], { icon: this.makePinIcon() }).addTo(this.map);
      this.placingPin.set(false);
    });
  }

  private makeMarkerIcon(): L.DivIcon {
    return L.divIcon({
      html: `<div style="width:10px;height:10px;background:#7c3aed;border-radius:50%;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>`,
      className: '',
      iconSize: [10, 10],
      iconAnchor: [5, 5],
      popupAnchor: [0, -10],
    });
  }

  private makeSelectedIcon(): L.DivIcon {
    return L.divIcon({
      html: `<div style="width:14px;height:14px;background:#5b21b6;border-radius:50%;border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35)"></div>`,
      className: '',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
      popupAnchor: [0, -12],
    });
  }

  private makePinIcon(): L.DivIcon {
    return L.divIcon({
      html: `<div style="width:16px;height:16px;background:#7c3aed;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35)"></div>`,
      className: '',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
  }

  private updateMarkers(roasters: Roaster[]) {
    const prev = this.selectedRoaster();
    this.markersLayer.clearLayers();
    this.markerMap.clear();

    const icon = this.makeMarkerIcon();
    const selectedIcon = this.makeSelectedIcon();

    roasters.forEach(r => {
      const isSelected = prev?.id === r.id;
      const marker = L.marker([r.lat, r.lng], { icon: isSelected ? selectedIcon : icon });
      marker.bindPopup(this.buildPopup(r), { closeButton: false, minWidth: 160 });
      marker.on('click', () => this.onMarkerClick(r, marker));
      this.markersLayer.addLayer(marker);
      this.markerMap.set(r.id, marker);
    });
  }

  private buildPopup(r: Roaster): string {
    const location = this.locationStr(r.city, r.country);
    return `
      <div style="font-family:inherit;padding:2px 0;">
        <strong style="font-size:13px;color:#1a1a1a;display:block;margin-bottom:2px;">${r.name}</strong>
        ${location ? `<span style="font-size:11px;color:#888;">${location}</span>` : ''}
        ${r.website ? `<br/><a href="${r.website}" target="_blank" rel="noopener" style="font-size:11px;color:#7c3aed;text-decoration:none;display:inline-block;margin-top:4px;">Visit website →</a>` : ''}
      </div>
    `;
  }

  private onMarkerClick(r: Roaster, marker: L.Marker) {
    const prev = this.selectedRoaster();
    if (prev && prev.id !== r.id) {
      const prevMarker = this.markerMap.get(prev.id);
      if (prevMarker) prevMarker.setIcon(this.makeMarkerIcon());
    }
    marker.setIcon(this.makeSelectedIcon());
    this.selectedRoaster.set(r);
  }

  flyTo(r: Roaster) {
    this.selectedRoaster.set(r);
    const marker = this.markerMap.get(r.id);
    this.map.flyTo([r.lat, r.lng], Math.max(this.map.getZoom(), 12), { duration: 0.6 });
    marker?.openPopup();
    this.updateMarkers(this.filteredRoasters());
  }

  async geocodeAddress() {
    const q = this.geocodeQuery.trim();
    if (!q) return;
    this.geocoding.set(true);
    this.geocodeOpen.set(false);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=1`
      );
      const data = await res.json();
      this.geocodeResults.set(data);
      this.geocodeOpen.set(data.length > 0);
    } catch {
      this.geocodeResults.set([]);
    }
    this.geocoding.set(false);
  }

  selectGeocode(result: any) {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    this.newLat.set(lat);
    this.newLng.set(lng);
    if (this.pinMarker) this.pinMarker.remove();
    this.pinMarker = L.marker([lat, lng], { icon: this.makePinIcon() }).addTo(this.map);
    this.map.flyTo([lat, lng], 15, { duration: 0.5 });
    this.geocodeOpen.set(false);
    this.placingPin.set(false);
    const addr = result.address ?? {};
    if (!this.newCity) this.newCity = addr.city ?? addr.town ?? addr.village ?? '';
    if (!this.newCountry) this.newCountry = addr.country ?? '';
  }

  startSubmit() {
    this.resetSubmitForm();
    this.sidebarView.set('submit');
  }

  cancelSubmit() {
    this.resetSubmitForm();
    this.sidebarView.set('list');
    if (this.pinMarker) { this.pinMarker.remove(); this.pinMarker = null; }
  }

  repositionPin() {
    this.placingPin.set(true);
    this.newLat.set(null);
    this.newLng.set(null);
    if (this.pinMarker) { this.pinMarker.remove(); this.pinMarker = null; }
  }

  async submitRoaster() {
    if (!this.newName.trim() || this.newLat() === null || this.newLng() === null) return;
    this.submitting.set(true);
    this.submitError.set(null);

    const { error } = await this.roasterService.submitRoaster({
      name: this.newName.trim(),
      lat: this.newLat()!,
      lng: this.newLng()!,
      country: this.newCountry.trim() || null,
      city: this.newCity.trim() || null,
      website: this.newWebsite.trim() || null,
      description: this.newDescription.trim() || null,
    });

    this.submitting.set(false);
    if (error) {
      this.submitError.set('An error occurred. Please try again.');
    } else {
      this.submitSuccess.set(true);
      if (this.pinMarker) { this.pinMarker.remove(); this.pinMarker = null; }
    }
  }

  async approve(id: string) {
    await this.roasterService.approve(id);
    this.updateMarkers(this.filteredRoasters());
  }

  async reject(id: string) {
    await this.roasterService.reject(id);
  }

  async importFromOSM() {
    this.importing.set(true);
    this.importMessage.set('Fetching data from OpenStreetMap… this may take up to 2 minutes.');
    const { imported, found, detail, error } = await this.roasterService.importFromOSM();
    this.importing.set(false);
    if (error) {
      this.importMessage.set(`Import error: ${detail ?? 'unknown error'}`);
    } else {
      this.importMessage.set(`Done — ${found} found in OSM, ${imported} imported or updated.`);
    }
  }

  locationStr(city: string | null, country: string | null): string {
    return [city, country].filter(s => !!s).join(', ');
  }

  private resetSubmitForm() {
    this.newName = '';
    this.newCountry = '';
    this.newCity = '';
    this.newWebsite = '';
    this.newDescription = '';
    this.newLat.set(null);
    this.newLng.set(null);
    this.placingPin.set(false);
    this.submitSuccess.set(false);
    this.submitError.set(null);
    this.submitting.set(false);
    this.geocodeQuery = '';
    this.geocodeResults.set([]);
    this.geocodeOpen.set(false);
    this.geocoding.set(false);
  }
}
