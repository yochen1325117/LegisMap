import { useEffect, useRef, useState } from 'react';
import { matchPath, useLocation, useNavigate } from 'react-router-dom';
import { createTaiwanMap } from 'taiwan-atlas';
import type { MapOverlay, RegionMeta, TaiwanMapError, TaiwanMapInstance } from 'taiwan-atlas';
import type { Geometry } from 'geojson';
import { dataAsOfDate, districtsForCounty, electoralDistrictById, eventMembers, fieldSources, loadDistrictFeatures, members, membersForDistrict, membersForRegion, rosterSource, sourcesForEvent, sourcesForIds, type ElectoralDistrictFeature, type ElectoralDistrictMeta, type EventCategory, type MemberRecord, type SourceRecord } from './data/legislators.ts';

const specialSeats = [
  ['party_list', '全國不分區及僑居國外國民'],
  ['plains_indigenous', '平地原住民選舉區'],
  ['mountain_indigenous', '山地原住民選舉區'],
] as const;

// Fit the main island rather than the full national extent, which includes distant islands.
const mainlandView = {
  type: 'Polygon' as const,
  coordinates: [[[119.65, 21.35], [122.55, 21.35], [122.55, 25.9], [119.65, 25.9], [119.65, 21.35]]],
};

function SourceLinks({ items, label }: { items: SourceRecord[]; label: string }) {
  return <span className="field-sources">{items.map(source => <a key={source.id} href={source.url} target="_blank" rel="noopener noreferrer" title={`${source.publisher}｜${source.title}｜${source.evidenceLocator}｜查閱 ${source.accessedAt}`} aria-label={`${label}來源：${source.publisher} ${source.title}`}>來源 ↗</a>)}</span>;
}

const eventCategoryLabels: Record<EventCategory, string> = {
  contribution: '立法與問政成果', good_deed: '公益與公共服務', concern: '爭議與責任紀錄', anecdote: '人物側寫',
};
const eventStatusLabels: Record<string, string> = {
  documented: '紀錄已核對', reported: '報導已核對', disputed: '主張有爭議',
  investigation: '查核中', indicted: '已起訴，法院審理中', judgment_appealable: '一審判決，可上訴', resolved: '事件已有後續結果',
};
const evidenceLabels: Record<string, string> = { official_confirmed: '官方確認', independently_corroborated: '獨立交叉查證', attributed_claim: '具名單方說法' };
const roleTypeLabels: Record<string, string> = { lead_proposer: '主提案', co_proposer: '共同提案', cosigner: '連署', questioner: '質詢', coordinator: '協調', donor: '本人捐贈', subject: '事件當事人', participant: '參與' };
const resultLabels: Record<string, string> = { proposed: '提案', under_review: '審查中', passed: '通過', implemented: '執行中', completed: '完成', recorded: '已有紀錄', alleged: '指控', under_investigation: '偵查中', indicted: '起訴', appealable: '上訴中', final: '確定', resolved: '已結案' };

function MemberEvents({ memberId }: { memberId: string }) {
  const research = eventMembers.get(memberId);
  const [expanded, setExpanded] = useState<Partial<Record<EventCategory, boolean>>>({});
  if (!research) return <p className="research-pending">此地區尚未完成事蹟資料查證。</p>;
  return <div className="profile-events"><p className="source-note">事蹟資料查閱日：{research.reviewedAt}。事件描述以所附來源可查證的內容為準。</p>
    {(research.backgroundRecords?.length ?? 0) > 0 && <section className="research-section background-section"><h3>人物背景</h3>{research.backgroundRecords?.map(record => <article className="event-card" key={record.id}><h4>{record.title}</h4><p>{record.summary}</p><p><strong>角色：</strong>{record.role}</p><p className="event-source-list"><strong>來源：</strong>{sourcesForIds(record.sourceIds).map(source => <a key={source.id} href={source.url} target="_blank" rel="noopener noreferrer">{source.publisher}・{source.title} ↗</a>)}</p></article>)}</section>}
    {(Object.keys(eventCategoryLabels) as EventCategory[]).map(category => {
      const events = research.events.filter(event => event.category === category && event.visibility === 'public').sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
      const shown = expanded[category] ? events : events.slice(0, 3);
      return <section className="research-section" key={category}>
      <h3>{eventCategoryLabels[category]}</h3>
      {shown.map(event => <article className="event-card" key={event.id}>
        <h4>{event.title}</h4><time dateTime={event.occurredAt}>{event.occurredAt}</time>
        <div className="event-tags"><span>{evidenceLabels[event.evidenceLevel]}</span><span>{roleTypeLabels[event.roleType]}</span><span>{resultLabels[event.resultStatus]}</span>{event.mandateRelation === 'before_legislative_service' && <span className="preterm-tag">任期前</span>}{event.mandateRelation === 'prior_public_role' && <span>先前公職期間</span>}</div>
        <p>{event.summary}</p><p><strong>角色：</strong>{event.role}</p><p><strong>查證狀態：</strong>{eventStatusLabels[event.processStatus] ?? event.processStatus}</p><p><strong>結果／進度：</strong>{event.outcome}</p>
        {event.personResponse && <p><strong>當事人回應：</strong>{event.personResponse}</p>}
        {event.resolution && <p><strong>查證界線：</strong>{event.resolution}</p>}
        <p className="event-source-list"><strong>來源：</strong>{sourcesForEvent(event).map(source => <a key={source.id} href={source.url} target="_blank" rel="noopener noreferrer" title={`${source.publisher}｜${source.evidenceLocator}｜首次查閱 ${source.accessedAt}｜最近複核 ${source.lastVerifiedAt ?? source.accessedAt}`}>{source.publisher}・{source.title} ↗</a>)}</p>
      </article>)}
      {!events.length && <p className="empty-research">截至 {research.reviewedAt} 尚無已核實資料。</p>}
      {events.length > 3 && <button className="event-expand" onClick={() => setExpanded(current => ({ ...current, [category]: !current[category] }))}>{expanded[category] ? '收合' : `查看其餘 ${events.length - 3} 則`}</button>}
    </section>;})}
  </div>;
}

function CountyElectoralMap({ countyId, overlays, selectedOverlayId, selectedGeometry, onCounty, onOverlay, onReady, onError }: {
  countyId: string; overlays: MapOverlay[]; selectedOverlayId: string | null; selectedGeometry?: Geometry;
  onCounty: (id: string) => void; onOverlay: (id: string) => void;
  onReady: (map: TaiwanMapInstance | null) => void; onError: (error: TaiwanMapError) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<TaiwanMapInstance | null>(null);
  const callbacks = useRef({ onCounty, onOverlay, onError });
  callbacks.current = { onCounty, onOverlay, onError };

  useEffect(() => {
    if (!containerRef.current) return;
    const instance = createTaiwanMap(containerRef.current, {
      initialCountyId: countyId === 'TW' ? null : countyId,
      onCountyClick: county => callbacks.current.onCounty(county.id),
      onOverlayClick: id => callbacks.current.onOverlay(id),
      onError: error => callbacks.current.onError(error),
      theme: { selectedFill: '#7eb8a4', selectedStroke: '#0b5c50', hoverFill: '#b7d7ca' },
    });
    mapRef.current = instance;
    onReady(instance);
    return () => { mapRef.current = null; onReady(null); instance.destroy(); };
  }, [onReady]);

  useEffect(() => {
    const instance = mapRef.current;
    if (!instance) return;
    let cancelled = false;
    void instance.ready.then(async () => {
      if (cancelled) return;
      if (countyId === 'TW') {
        await instance.reset();
        if (!cancelled) await instance.fitGeometry(mainlandView);
      }
      else await instance.selectCounty(countyId);
      if (!cancelled && selectedGeometry) await instance.fitGeometry(selectedGeometry);
    }).catch(error => { if (!cancelled) callbacks.current.onError(error as TaiwanMapError); });
    return () => { cancelled = true; };
  }, [countyId, selectedGeometry]);

  useEffect(() => {
    const instance = mapRef.current;
    if (!instance) return;
    let cancelled = false;
    void instance.ready.then(() => {
      if (!cancelled && mapRef.current === instance) instance.setOverlays(overlays, selectedOverlayId);
    }).catch(error => { if (!cancelled) callbacks.current.onError(error as TaiwanMapError); });
    return () => { cancelled = true; };
  }, [overlays, selectedOverlayId]);
  return <div className="electoral-map" ref={containerRef} />;
}

function RegionNavigator({ map, selectedCountyId, selectedDistrictId, onCounty, onDistrict, onClose }: {
  map: TaiwanMapInstance | null; selectedCountyId: string; selectedDistrictId?: string;
  onCounty: (id: string) => void; onDistrict: (id: string) => void; onClose: () => void;
}) {
  const [counties, setCounties] = useState<readonly RegionMeta[]>([]);
  const [expandedCountyId, setExpandedCountyId] = useState<string | null>(selectedCountyId === 'TW' ? null : selectedCountyId);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!map) return;
    let cancelled = false;
    void map.listRegions('TW').then(items => { if (!cancelled) setCounties(items); }).catch(() => { if (!cancelled) setError('縣市清單無法載入'); });
    return () => { cancelled = true; };
  }, [map]);
  useEffect(() => { if (selectedCountyId !== 'TW') setExpandedCountyId(selectedCountyId); }, [selectedCountyId]);
  const chooseCounty = (id: string) => { onCounty(id); onClose(); };
  const chooseDistrict = (id: string) => { onDistrict(id); onClose(); };
  return <nav aria-label="地區導覽" className="region-nav">
    <div className="rail-heading"><span className="eyebrow">REGION NAVIGATOR</span><h2>探索地區</h2><p>選擇縣市與第 11 屆立委選區，查看該區代表。</p></div>
    <button className={`country-link ${selectedCountyId === 'TW' ? 'is-current' : ''}`} onClick={() => chooseCounty('TW')} aria-current={selectedCountyId === 'TW' ? 'page' : undefined}><span className="country-icon" aria-hidden="true">◎</span><span>全台灣</span><span className="region-count">{members.length}</span></button>
    {error && <p role="alert" className="nav-error">{error}</p>}
    {!counties.length && !error && <p className="nav-loading">正在載入縣市…</p>}
    <div className="county-list">{counties.map(county => {
      const districts = districtsForCounty(county.id);
      const expandable = districts.length > 1;
      const expanded = expandable && expandedCountyId === county.id;
      return <div className="county-group" key={county.id}>
        <div className={`county-row ${selectedCountyId === county.id && !selectedDistrictId ? 'is-current' : ''}`}>
          <button className="county-select" onClick={() => chooseCounty(county.id)} aria-current={selectedCountyId === county.id && !selectedDistrictId ? 'page' : undefined}>{county.name}</button>
          <span className="region-count">{membersForRegion(county.name).length}</span>
          {expandable && <button className="expand-button" aria-label={`${expanded ? '收合' : '展開'}${county.name}選區`} aria-expanded={expanded} onClick={() => setExpandedCountyId(current => current === county.id ? null : county.id)}>{expanded ? '−' : '+'}</button>}
        </div>
        {expanded && <div className="district-nav-list">{districts.map(district => <button key={district.id} className={`district-nav-link ${selectedDistrictId === district.id ? 'is-current' : ''}`} aria-current={selectedDistrictId === district.id ? 'page' : undefined} onClick={() => chooseDistrict(district.id)}><span>第 {district.districtNumber} 選舉區</span><small>{district.scopeText}</small></button>)}</div>}
      </div>;
    })}</div>
    <div className="rail-footer"><span className="footer-mark">LM</span><span>資料基準日 {dataAsOfDate}<br />名單來源：立法院</span></div>
  </nav>;
}

function MemberCard({ member, onOpen }: { member: MemberRecord; onOpen: () => void }) {
  return <div className="member-card"><button className="member-card-main" onClick={onOpen}><span className="avatar" aria-hidden="true">{member.name.slice(0, 1)}</span><span className="legislator-card-text"><strong>{member.name}</strong><small>{member.districtLabel} · {member.mandateStatus === 'active' ? '現任' : '2026 年離職'}</small></span><span className="card-arrow" aria-hidden="true">↗</span></button><div className="member-card-sources"><span>姓名 <SourceLinks items={fieldSources(member, 'name')} label="姓名" /></span><span>選區 <SourceLinks items={fieldSources(member, 'districtLabel')} label="選區" /></span></div></div>;
}

function MemberList({ items, onOpen }: { items: MemberRecord[]; onOpen: (id: string) => void }) {
  return <div className="member-list">{items.map(member => <MemberCard key={member.id} member={member} onOpen={() => onOpen(member.id)} />)}</div>;
}

function ProfileContent({ member }: { member: MemberRecord }) {
  return <div className="profile-content">
    <div className="profile-hero"><span className="profile-avatar" aria-hidden="true">{member.name.slice(0, 1)}</span><span className="eyebrow">LEGISLATOR PROFILE</span><h2>{member.name}</h2><p>第 11 屆 · {member.mandateStatus === 'active' ? '現任' : '2026 年離職'}</p></div>
    <div className="profile-facts"><div><span>姓名</span><div className="fact-value"><strong>{member.name}</strong><SourceLinks items={fieldSources(member, 'name')} label="姓名" /></div></div><div><span>選區</span><div className="fact-value"><strong>{member.districtLabel}</strong><SourceLinks items={fieldSources(member, 'districtLabel')} label="選區" /></div></div><div><span>任職狀態</span><div className="fact-value"><strong>{member.mandateStatus === 'active' ? '現任' : '已離職'}</strong><SourceLinks items={fieldSources(member, 'mandateStatus')} label="任職狀態" /></div></div><div><span>到職日期</span><div className="fact-value"><strong>{member.serviceStart}</strong><SourceLinks items={fieldSources(member, 'serviceStart')} label="到職日期" /></div></div>{member.serviceEnd && <div><span>離職生效日期</span><div className="fact-value"><strong>{member.serviceEnd}</strong><SourceLinks items={fieldSources(member, 'serviceEnd')} label="離職日期" /></div></div>}</div>
    <p className="source-note">資料基準日：{dataAsOfDate}。選區文字照錄立法院個人頁；人物頁資料由委員研究室提供，請以來源頁面為準。</p>
    <MemberEvents memberId={member.id} />
  </div>;
}

function ProfileDialog({ member, onClose, returnFocus }: { member: MemberRecord; onClose: () => void; returnFocus: React.RefObject<HTMLElement | null> }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => { returnFocus.current?.focus(); };
  }, []);
  const keepFocusInside = (event: React.KeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== 'Tab') return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter(element => element.getClientRects().length > 0);
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };
  return <dialog ref={dialogRef} className="profile-dialog" aria-labelledby="profile-dialog-title" onKeyDown={keepFocusInside} onCancel={event => { event.preventDefault(); onClose(); }} onClose={onClose} onPointerDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="profile-dialog-card">
      <div className="profile-dialog-header"><span id="profile-dialog-title">立法委員詳細資料</span><button autoFocus onClick={onClose} aria-label="關閉立法委員詳細資料">關閉 ×</button></div>
      <ProfileContent member={member} />
    </div>
  </dialog>;
}

function RosterPanel({ regionName, isCountry, district, onMember }: {
  regionName: string; isCountry: boolean; district?: ElectoralDistrictMeta; onMember: (id: string) => void;
}) {
  const visible = district ? membersForDistrict(district.id) : isCountry ? members : membersForRegion(regionName);
  const districtMembers = visible.filter(item => item.seatType === 'district');
  const title = district?.name ?? regionName;
  return <div className="panel-content"><div className="panel-intro"><span className="eyebrow">2026 LEGISLATORS</span><h2>{title}</h2><p>{district ? district.scopeText : `2026-01-01 至 ${dataAsOfDate} 曾在職的第 11 屆立法委員。`}</p><p className="roster-source">名單來源：<a href={rosterSource.url} target="_blank" rel="noopener noreferrer">{rosterSource.publisher}第 11 屆名單 ↗</a></p></div>
    <div className="summary-strip"><div><strong>{visible.length}</strong><span>曾在職委員</span></div><div><strong>{visible.filter(item => item.mandateStatus === 'active').length}</strong><span>目前在職</span></div></div>
    <section className="panel-section"><div className="section-heading"><span className="eyebrow">DISTRICT SEATS</span><h3>{district ? '本選區代表' : isCountry ? '區域委員' : '此縣市委員'} <span className="section-count">{districtMembers.length}</span></h3></div>{districtMembers.length ? <MemberList items={districtMembers} onOpen={onMember} /> : <div className="empty-state"><h4>此縣市沒有區域席次資料</h4><p>不分區與原住民席次請從全台灣名單查看。</p></div>}</section>
    {isCountry && specialSeats.map(([type, label]) => <section className="panel-section" key={type}><div className="section-heading"><h3>{label} <span className="section-count">{members.filter(item => item.seatType === type).length}</span></h3></div><MemberList items={members.filter(item => item.seatType === type)} onOpen={onMember} /></section>)}
  </div>;
}

export function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const districtMemberMatch = matchPath('/region/:countyId/district/:districtId/legislator/:memberId', location.pathname);
  const countyMemberMatch = matchPath('/region/:countyId/legislator/:memberId', location.pathname);
  const districtMatch = matchPath('/region/:countyId/district/:districtId', location.pathname);
  const countyMatch = matchPath('/region/:countyId', location.pathname);
  const legacyMemberMatch = matchPath('/legislator/:memberId', location.pathname);
  const memberId = districtMemberMatch?.params.memberId ?? countyMemberMatch?.params.memberId ?? legacyMemberMatch?.params.memberId;
  const selectedMember = members.find(item => item.id === memberId);
  const inferredDistrict = selectedMember?.electoralDistrictId ? electoralDistrictById.get(selectedMember.electoralDistrictId) : undefined;
  const routeCountyId = districtMemberMatch?.params.countyId ?? countyMemberMatch?.params.countyId ?? districtMatch?.params.countyId ?? countyMatch?.params.countyId;
  const countyId = routeCountyId ?? inferredDistrict?.countyId ?? 'TW';
  const requestedDistrictId = districtMemberMatch?.params.districtId ?? districtMatch?.params.districtId ?? (legacyMemberMatch ? inferredDistrict?.id : undefined);
  const routeDistrict = requestedDistrictId ? electoralDistrictById.get(requestedDistrictId) : undefined;
  const selectedDistrict = routeDistrict?.countyId === countyId ? routeDistrict : undefined;
  const countyDistricts = districtsForCounty(countyId);
  const [map, setMap] = useState<TaiwanMapInstance | null>(null);
  const [regionNames, setRegionNames] = useState<Record<string, string>>({ TW: '全台灣' });
  const [mapError, setMapError] = useState('');
  const [geometryError, setGeometryError] = useState('');
  const [districtFeatures, setDistrictFeatures] = useState<ElectoralDistrictFeature[]>([]);
  const [navOpen, setNavOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const profileOpenerRef = useRef<HTMLElement | null>(null);
  const regionName = countyId === 'TW' ? '全台灣' : regionNames[countyId] ?? selectedDistrict?.countyName ?? inferredDistrict?.countyName ?? '載入中…';

  useEffect(() => {
    if (!map) return;
    let cancelled = false;
    void map.listRegions('TW').then(items => { if (!cancelled) setRegionNames(current => ({ ...current, ...Object.fromEntries(items.map(item => [item.id, item.name])) })); });
    return () => { cancelled = true; };
  }, [map]);

  useEffect(() => {
    if (countyId === 'TW' || countyDistricts.length <= 1) {
      setDistrictFeatures([]);
      setGeometryError('');
      return;
    }
    let cancelled = false;
    setGeometryError('');
    void loadDistrictFeatures(countyId).then(features => {
      if (!cancelled) setDistrictFeatures(features);
    }).catch(() => {
      if (!cancelled) {
        setDistrictFeatures([]);
        setGeometryError('選區邊界無法載入，請稍後再試。');
      }
    });
    return () => { cancelled = true; };
  }, [countyId, countyDistricts.length]);

  const basePath = countyId === 'TW' ? '/' : selectedDistrict ? `/region/${countyId}/district/${selectedDistrict.id}` : `/region/${countyId}`;
  const chooseCounty = (id: string) => { navigate(id === 'TW' ? '/' : `/region/${id}`); setPanelOpen(true); };
  const chooseDistrict = (id: string) => {
    const district = electoralDistrictById.get(id);
    if (!district) return;
    navigate(`/region/${district.countyId}/district/${district.id}`);
    setPanelOpen(true);
  };
  const chooseMember = (id: string) => {
    profileOpenerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const suffix = `legislator/${id}`;
    navigate(basePath === '/' ? `/region/TW/${suffix}` : `${basePath}/${suffix}`);
  };
  const closeMember = () => navigate(basePath, { replace: true });
  const onMapError = (error: TaiwanMapError) => setMapError(error.message);
  const share = async () => { try { await navigator.clipboard.writeText(window.location.href); setCopied(true); window.setTimeout(() => setCopied(false), 2000); } catch { setCopied(false); } };
  const breadcrumbBase = selectedDistrict ? `${regionName} / 第 ${selectedDistrict.districtNumber} 選舉區` : regionName;
  const breadcrumb = selectedMember ? `${breadcrumbBase} / ${selectedMember.name}` : breadcrumbBase;
  const overlays: MapOverlay[] = districtFeatures.map(feature => ({ id: feature.id, geometry: feature.geometry, fillColor: '#63a999', lineColor: '#16685d' }));
  const selectedGeometry = selectedDistrict ? districtFeatures.find(feature => feature.id === selectedDistrict.id)?.geometry : undefined;

  return <div className="app-shell">
    <header className="app-header"><div className="brand"><span className="brand-symbol" aria-hidden="true">◎</span><div><span className="brand-name">委員地圖</span><span className="brand-english">LEGISMAP</span></div></div><div className="header-context"><span className="context-prefix">正在探索</span><span className="context-path">{breadcrumb}</span></div><div className="header-actions"><span className="demo-pill">資料截至 {dataAsOfDate}</span><button className="header-button share-button" onClick={share}>{copied ? '已複製連結' : '分享頁面 ↗'}</button><button className="header-button mobile-nav-button" onClick={() => setNavOpen(true)}>地區選單</button></div></header>
    <div className="disclaimer" role="note"><span className="disclaimer-dot" />第 11 屆選區依中選會公告範圍與國土測繪中心 112 年 9 月村里界建立。資料基準日 {dataAsOfDate}。</div>
    <div className="workspace">
      {navOpen && <button className="mobile-backdrop" aria-label="關閉地區選單" onClick={() => setNavOpen(false)} />}
      <aside className={`left-rail ${navOpen ? 'is-open' : ''}`}><button className="mobile-close" onClick={() => setNavOpen(false)}>關閉 ×</button><RegionNavigator map={map} selectedCountyId={countyId} selectedDistrictId={selectedDistrict?.id} onCounty={chooseCounty} onDistrict={chooseDistrict} onClose={() => setNavOpen(false)} /></aside>
      <main className="map-area"><div className="map-heading"><div><span className="eyebrow">INTERACTIVE ATLAS</span><h1>從地圖，看見你的國會代表。</h1></div><button onClick={() => chooseCounty('TW')}>返回全台 ↗</button></div><div className="map-stage"><CountyElectoralMap countyId={countyId} overlays={overlays} selectedOverlayId={selectedDistrict?.id ?? null} selectedGeometry={selectedGeometry} onCounty={chooseCounty} onOverlay={chooseDistrict} onReady={setMap} onError={onMapError} />{(mapError || geometryError) && <div className="map-error" role="alert">地圖無法載入：{mapError || geometryError}</div>}<div className="map-legend"><span><i className="legend-admin" />行政區</span><span><i className="legend-electoral" />立委選區</span><span><i className="legend-selected" />目前選取</span></div></div><div className="map-caption"><span>底圖：Taiwan-Atlas</span><span>選區：中選會第 11 屆範圍、國土測繪中心 112 年 9 月村里界</span></div></main>
      <aside className={`right-panel ${panelOpen ? 'is-open' : ''}`} aria-label="地區與立委名單"><div className="panel-mobile-handle"><button onClick={() => setPanelOpen(open => !open)}>{panelOpen ? '收合資料' : '查看資料'} {panelOpen ? '⌄' : '⌃'}</button></div><RosterPanel regionName={regionName} isCountry={countyId === 'TW'} district={selectedDistrict} onMember={chooseMember} /></aside>
    </div>
    {selectedMember && <ProfileDialog key={selectedMember.id} member={selectedMember} onClose={closeMember} returnFocus={profileOpenerRef} />}
  </div>;
}
