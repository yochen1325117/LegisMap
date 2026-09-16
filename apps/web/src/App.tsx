import { useEffect, useMemo, useState } from 'react';
import { useMatch, useNavigate } from 'react-router-dom';
import { TaiwanDrilldownMap } from 'taiwan-atlas/react';
import type { RegionMeta, TaiwanMapInstance, TaiwanMapError } from 'taiwan-atlas';
import type { ElectoralDistrict, Legislator, LegislatorEvent } from '@legismap/shared-types';
import { districtsForRegion, legislatorsForDistricts } from '@legismap/electoral-map';
import { mockDistricts, mockEvents, mockLegislators } from './data/mock.ts';

const overlays = mockDistricts.map(district => ({ id: district.id, geometry: district.geometry, fillColor: '#1c857a', lineColor: '#126d64' }));
const categoryLabels: Record<LegislatorEvent['category'], string> = {
  legislation: '提案', speech: '質詢', vote: '表決', policy: '政策', controversy: '事件', legal: '司法紀錄', other: '其他',
};

function RegionNavigator({ map, selectedId, onSelect, onClose }: {
  map: TaiwanMapInstance | null;
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const [counties, setCounties] = useState<readonly RegionMeta[]>([]);
  const [towns, setTowns] = useState<Record<string, readonly RegionMeta[]>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!map) return;
    let cancelled = false;
    void map.listRegions('TW').then(items => { if (!cancelled) setCounties(items); }).catch(() => { if (!cancelled) setError('地區清單無法載入'); });
    return () => { cancelled = true; };
  }, [map]);

  useEffect(() => {
    if (!map || selectedId === 'TW') return;
    const countyId = selectedId.slice(0, 5);
    setExpanded(countyId);
    if (towns[countyId]) return;
    let cancelled = false;
    void map.listRegions(countyId).then(items => { if (!cancelled) setTowns(current => ({ ...current, [countyId]: items })); }).catch(() => { if (!cancelled) setError('鄉鎮市區清單無法載入'); });
    return () => { cancelled = true; };
  }, [map, selectedId, towns]);

  const toggle = (countyId: string) => {
    if (expanded === countyId) { setExpanded(null); return; }
    setExpanded(countyId);
    if (!map || towns[countyId]) return;
    void map.listRegions(countyId).then(items => setTowns(current => ({ ...current, [countyId]: items }))).catch(() => setError('鄉鎮市區清單無法載入'));
  };
  const choose = (id: string) => { onSelect(id); onClose(); };

  return <nav aria-label="地區導覽" className="region-nav">
    <div className="rail-heading"><span className="eyebrow">REGION NAVIGATOR</span><h2>探索地區</h2><p>由行政區出發，查看示範選區與代表。</p></div>
    <button className={`country-link ${selectedId === 'TW' ? 'is-current' : ''}`} onClick={() => choose('TW')} aria-current={selectedId === 'TW' ? 'page' : undefined}>
      <span className="country-icon" aria-hidden="true">◎</span><span>全台灣</span><span className="region-count">22</span>
    </button>
    {error && <p role="alert" className="nav-error">{error}</p>}
    {!counties.length && !error && <p className="nav-loading">正在載入縣市…</p>}
    <div className="county-list">
      {counties.map(county => <div className="county-group" key={county.id}>
        <div className={`county-row ${selectedId === county.id ? 'is-current' : ''}`}>
          <button className="county-select" onClick={() => choose(county.id)} aria-current={selectedId === county.id ? 'page' : undefined}>{county.name}</button>
          <button className="expand-button" aria-label={`${expanded === county.id ? '收合' : '展開'}${county.name}`} aria-expanded={expanded === county.id} onClick={() => toggle(county.id)}>{expanded === county.id ? '−' : '+'}</button>
        </div>
        {expanded === county.id && <div className="town-list">
          {!towns[county.id] && <span className="nav-loading">載入中…</span>}
          {towns[county.id]?.map(town => <button key={town.id} className={`town-link ${selectedId === town.id ? 'is-current' : ''}`} onClick={() => choose(town.id)} aria-current={selectedId === town.id ? 'page' : undefined}>{town.name}</button>)}
        </div>}
      </div>)}
    </div>
    <div className="rail-footer"><span className="footer-mark">LM</span><span>以地理位置為入口<br />探索公共資訊</span></div>
  </nav>;
}

function LegislatorCard({ legislator, district, onOpen }: { legislator: Legislator; district: ElectoralDistrict; onOpen: () => void }) {
  return <button className="legislator-card" onClick={onOpen}>
    <span className="avatar" aria-hidden="true">{legislator.name.slice(-1)}</span>
    <span className="legislator-card-text"><strong>{legislator.name}</strong><small>{legislator.party} · {district.name}</small></span>
    <span className="card-arrow" aria-hidden="true">↗</span>
  </button>;
}

function Timeline({ events }: { events: LegislatorEvent[] }) {
  return <ol className="timeline">
    {events.map(event => <li key={event.id} className="timeline-item">
      <div className="timeline-date">{event.occurredAt}</div>
      <div className="timeline-body"><span className="event-category">{categoryLabels[event.category]}</span><h4>{event.title}</h4><p>{event.summary}</p>
        <div className="source-row">{event.sources.map(source => <a key={source.id} href={source.url} target="_blank" rel="noopener noreferrer">↗ {source.title}</a>)}</div>
      </div>
    </li>)}
  </ol>;
}

function DetailPanel({ regionId, regionName, district, legislator, onDistrict, onLegislator, onBack }: {
  regionId: string;
  regionName: string;
  district?: ElectoralDistrict;
  legislator?: Legislator;
  onDistrict: (id: string) => void;
  onLegislator: (id: string) => void;
  onBack: () => void;
}) {
  if (legislator) {
    const events = mockEvents.filter(event => event.legislatorId === legislator.id).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
    return <div className="panel-content">
      <button className="text-back" onClick={onBack}>← 返回選區</button>
      <div className="profile-hero"><span className="profile-avatar" aria-hidden="true">{legislator.name.slice(-1)}</span><span className="eyebrow">LEGISLATOR PROFILE · DEMO</span><h2>{legislator.name}</h2><p>{legislator.party} · 第 {legislator.term} 屆示範資料</p></div>
      <div className="profile-facts"><div><span>示範選區</span><button onClick={() => onDistrict(legislator.electoralDistrictId)}>{legislator.areaName} ↗</button></div><div><span>就任日期</span><strong>{legislator.tookOfficeAt}</strong></div><div><span>委員會</span><strong>{legislator.committees?.join('、')}</strong></div></div>
      <section className="panel-section"><div className="section-heading"><span className="eyebrow">BACKGROUND</span><h3>基本資料</h3></div><p className="detail-copy">學歷：{legislator.education?.join('、')}</p><p className="detail-copy">經歷：{legislator.experience?.join('、')}</p></section>
      <section className="panel-section"><div className="section-heading"><span className="eyebrow">PUBLIC RECORD</span><h3>事件時間軸 <span className="section-count">{events.length}</span></h3></div><Timeline events={events} /></section>
    </div>;
  }

  const visibleDistricts = district ? [district] : districtsForRegion(regionId, mockDistricts);
  const visibleLegislators = legislatorsForDistricts(visibleDistricts, mockLegislators);
  const title = district?.name ?? regionName;
  return <div className="panel-content">
    {district && <button className="text-back" onClick={onBack}>← 返回地區</button>}
    <div className="panel-intro"><span className="eyebrow">{district ? 'ELECTORAL DISTRICT' : 'CURRENT REGION'}</span><h2>{title}</h2><p>{district ? '這個獨立的示範選區 polygon 疊在行政地圖上。' : regionId === 'TW' ? '目前可瀏覽的示範人物與選區。' : '查看此行政區對應的示範選區與人物。'}</p></div>
    <div className="summary-strip"><div><strong>{visibleDistricts.length}</strong><span>示範選區</span></div><div><strong>{visibleLegislators.length}</strong><span>示範代表</span></div></div>
    <section className="panel-section"><div className="section-heading"><span className="eyebrow">REPRESENTATIVES</span><h3>代表名單</h3></div>
      {!visibleDistricts.length && <div className="empty-state"><span aria-hidden="true">○</span><h4>此區尚無示範人物</h4><p>目前只在台北與高雄的部分區域放入虛構資料。你仍可探索完整行政地圖。</p></div>}
      {visibleDistricts.map(item => <div className="district-group" key={item.id}><button className="district-label" onClick={() => onDistrict(item.id)}><span>{item.name}</span><span aria-hidden="true">↗</span></button>{mockLegislators.filter(person => item.legislatorIds.includes(person.id)).map(person => <LegislatorCard key={person.id} legislator={person} district={item} onOpen={() => onLegislator(person.id)} />)}</div>)}
    </section>
  </div>;
}

export function App() {
  const navigate = useNavigate();
  const regionMatch = useMatch('/region/:regionId');
  const districtMatch = useMatch('/district/:districtId');
  const legislatorMatch = useMatch('/legislator/:legislatorId');
  const selectedLegislator = mockLegislators.find(item => item.id === legislatorMatch?.params.legislatorId);
  const selectedDistrict = mockDistricts.find(item => item.id === (districtMatch?.params.districtId ?? selectedLegislator?.electoralDistrictId));
  const regionId = regionMatch?.params.regionId ?? selectedDistrict?.regionNodeIds[0] ?? 'TW';
  const [map, setMap] = useState<TaiwanMapInstance | null>(null);
  const [regionNames, setRegionNames] = useState<Record<string, string>>({ TW: '全台灣' });
  const [mapError, setMapError] = useState('');
  const [navOpen, setNavOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const regionName = regionNames[regionId] ?? (regionId === 'TW' ? '全台灣' : `地區 ${regionId}`);

  useEffect(() => {
    if (!map) return;
    let cancelled = false;
    void map.listRegions('TW').then(items => {
      if (!cancelled) setRegionNames(current => ({ ...current, ...Object.fromEntries(items.map(item => [item.id, item.name])) }));
    });
    if (regionId.length === 8) void map.listRegions(regionId.slice(0, 5)).then(items => {
      if (!cancelled) setRegionNames(current => ({ ...current, ...Object.fromEntries(items.map(item => [item.id, item.name])) }));
    });
    return () => { cancelled = true; };
  }, [map, regionId]);

  useEffect(() => {
    if (!map || !selectedDistrict) return;
    let cancelled = false;
    void map.ready.then(() => { if (!cancelled) return map.fitGeometry(selectedDistrict.geometry); }).catch(() => {});
    return () => { cancelled = true; };
  }, [map, selectedDistrict]);

  useEffect(() => {
    if (!map) return;
    let cancelled = false;
    void map.ready.then(() => { if (!cancelled) map.setOverlays(overlays, selectedDistrict?.id ?? null); }).catch(() => {});
    return () => { cancelled = true; };
  }, [map, selectedDistrict]);

  const chooseRegion = (id: string) => navigate(id === 'TW' ? '/' : `/region/${id}`);
  const chooseDistrict = (id: string) => { navigate(`/district/${id}`); setPanelOpen(true); };
  const chooseLegislator = (id: string) => { navigate(`/legislator/${id}`); setPanelOpen(true); };
  const goBack = () => selectedLegislator ? chooseDistrict(selectedLegislator.electoralDistrictId) : chooseRegion(regionId);
  const onRegionChange = (region: RegionMeta) => setRegionNames(current => current[region.id] === region.name ? current : { ...current, [region.id]: region.name });
  const onMapError = (error: TaiwanMapError) => setMapError(error.message);
  const share = async () => { try { await navigator.clipboard.writeText(location.href); setCopied(true); window.setTimeout(() => setCopied(false), 2000); } catch { setCopied(false); } };
  const currentBreadcrumb = useMemo(() => selectedLegislator ? `${selectedDistrict?.name ?? ''} / ${selectedLegislator.name}` : selectedDistrict?.name ?? regionName, [selectedLegislator, selectedDistrict, regionName]);

  return <div className="app-shell">
    <header className="app-header"><div className="brand"><span className="brand-symbol" aria-hidden="true">◎</span><div><span className="brand-name">委員地圖</span><span className="brand-english">LEGISMAP</span></div></div><div className="header-context"><span className="context-prefix">正在探索</span><span className="context-path">{currentBreadcrumb}</span></div><div className="header-actions"><span className="demo-pill">虛構資料展示</span><button className="header-button share-button" onClick={share}>{copied ? '已複製連結' : '分享頁面 ↗'}</button><button className="header-button mobile-nav-button" onClick={() => setNavOpen(true)}>地區選單</button></div></header>
    <div className="disclaimer" role="note"><span className="disclaimer-dot" />本網站目前為互動原型。所有代表、選區 polygon、事件與來源均為虛構示範，不是實際立法院或選舉資料。</div>
    <div className="workspace">
      {navOpen && <button className="mobile-backdrop" aria-label="關閉地區選單" onClick={() => setNavOpen(false)} />}
      <aside className={`left-rail ${navOpen ? 'is-open' : ''}`}><button className="mobile-close" onClick={() => setNavOpen(false)}>關閉 ×</button><RegionNavigator map={map} selectedId={regionId} onSelect={chooseRegion} onClose={() => setNavOpen(false)} /></aside>
      <main className="map-area"><div className="map-heading"><div><span className="eyebrow">INTERACTIVE ATLAS</span><h1>從地圖，看見你的國會代表。</h1></div><button onClick={() => chooseRegion('TW')}>返回全台 ↗</button></div><div className="map-stage">
        <TaiwanDrilldownMap regionId={regionId} onRegionIdChange={chooseRegion} onRegionChange={onRegionChange} onError={onMapError} mapRef={setMap} onOverlayClick={chooseDistrict} style={{ height: '100%' }} />
        {mapError && <div className="map-error" role="alert">地圖無法載入：{mapError}</div>}
        <div className="map-legend"><span><i className="legend-admin" />行政區</span><span><i className="legend-electoral" />示範選區</span></div>
      </div><div className="map-caption"><span>底圖：內政部國土測繪中心 · Taiwan-Atlas</span><span>選區形狀：虛構示範</span></div></main>
      <aside className={`right-panel ${panelOpen ? 'is-open' : ''}`} aria-label="地區與人物資料"><div className="panel-mobile-handle"><button onClick={() => setPanelOpen(open => !open)}>{panelOpen ? '收合資料' : '查看資料'} {panelOpen ? '⌄' : '⌃'}</button></div><DetailPanel regionId={regionId} regionName={regionName} district={selectedDistrict} legislator={selectedLegislator} onDistrict={chooseDistrict} onLegislator={chooseLegislator} onBack={goBack} /></aside>
    </div>
  </div>;
}
