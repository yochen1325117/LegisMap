import { useEffect, useState } from 'react';
import { useMatch, useNavigate } from 'react-router-dom';
import { TaiwanDrilldownMap } from 'taiwan-atlas/react';
import type { RegionMeta, TaiwanMapInstance, TaiwanMapError } from 'taiwan-atlas';
import { dataAsOfDate, eventMembers, fieldSources, members, membersForRegion, rosterSource, sourcesForEvent, type EventCategory, type MemberRecord, type SourceRecord } from './data/legislators.ts';

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
  contribution: '立委貢獻', good_deed: '正面事蹟', concern: '爭議事件', anecdote: '逸聞',
};

function MemberEvents({ memberId }: { memberId: string }) {
  const research = eventMembers.get(memberId);
  if (!research) return <p className="research-pending">此地區尚未完成事蹟資料查證。</p>;
  return <div className="profile-events"><p className="source-note">事蹟資料查閱日：{research.reviewedAt}。事件描述以所附來源可查證的內容為準。</p>
    {(Object.keys(eventCategoryLabels) as EventCategory[]).map(category => <section className="research-section" key={category}>
      <h3>{eventCategoryLabels[category]}</h3>
      {research.events.filter(event => event.category === category).map(event => <article className="event-card" key={event.id}>
        <h4>{event.title}</h4><time dateTime={event.occurredAt}>{event.occurredAt}</time>
        <p>{event.summary}</p><p><strong>角色：</strong>{event.role}</p><p><strong>結果／進度：</strong>{event.outcome}</p>
        {event.personResponse && <p><strong>當事人回應：</strong>{event.personResponse}</p>}
        {event.resolution && <p><strong>查證界線：</strong>{event.resolution}</p>}
        <p className="event-source-list"><strong>來源：</strong>{sourcesForEvent(event).map(source => <a key={source.id} href={source.url} target="_blank" rel="noopener noreferrer" title={`${source.publisher}｜${source.evidenceLocator}｜查閱 ${source.accessedAt}`}>{source.publisher}・{source.title} ↗</a>)}</p>
      </article>)}
      {!research.events.some(event => event.category === category) && <p className="empty-research">截至 {research.reviewedAt} 尚無已核實資料。</p>}
    </section>)}
  </div>;
}

function RegionNavigator({ map, selectedId, onSelect, onClose }: {
  map: TaiwanMapInstance | null; selectedId: string; onSelect: (id: string) => void; onClose: () => void;
}) {
  const [counties, setCounties] = useState<readonly RegionMeta[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!map) return;
    let cancelled = false;
    void map.listRegions('TW').then(items => { if (!cancelled) setCounties(items); }).catch(() => { if (!cancelled) setError('縣市清單無法載入'); });
    return () => { cancelled = true; };
  }, [map]);
  const choose = (id: string) => { onSelect(id); onClose(); };
  return <nav aria-label="地區導覽" className="region-nav">
    <div className="rail-heading"><span className="eyebrow">REGION NAVIGATOR</span><h2>探索地區</h2><p>選擇縣市，查看 2026 年曾在職的區域立委。</p></div>
    <button className={`country-link ${selectedId === 'TW' ? 'is-current' : ''}`} onClick={() => choose('TW')} aria-current={selectedId === 'TW' ? 'page' : undefined}><span className="country-icon" aria-hidden="true">◎</span><span>全台灣</span><span className="region-count">{members.length}</span></button>
    {error && <p role="alert" className="nav-error">{error}</p>}
    {!counties.length && !error && <p className="nav-loading">正在載入縣市…</p>}
    <div className="county-list">{counties.map(county => <div className={`county-row ${selectedId === county.id ? 'is-current' : ''}`} key={county.id}><button className="county-select" onClick={() => choose(county.id)} aria-current={selectedId === county.id ? 'page' : undefined}>{county.name}</button><span className="region-count">{membersForRegion(county.name).length}</span></div>)}</div>
    <div className="rail-footer"><span className="footer-mark">LM</span><span>資料基準日 {dataAsOfDate}<br />名單來源：立法院</span></div>
  </nav>;
}

function MemberCard({ member, onOpen }: { member: MemberRecord; onOpen: () => void }) {
  return <div className="member-card"><button className="member-card-main" onClick={onOpen}><span className="avatar" aria-hidden="true">{member.name.slice(0, 1)}</span><span className="legislator-card-text"><strong>{member.name}</strong><small>{member.districtLabel} · {member.mandateStatus === 'active' ? '現任' : '2026 年離職'}</small></span><span className="card-arrow" aria-hidden="true">↗</span></button><div className="member-card-sources"><span>姓名 <SourceLinks items={fieldSources(member, 'name')} label="姓名" /></span><span>選區 <SourceLinks items={fieldSources(member, 'districtLabel')} label="選區" /></span></div></div>;
}

function MemberList({ items, onOpen }: { items: MemberRecord[]; onOpen: (id: string) => void }) {
  return <div className="member-list">{items.map(member => <MemberCard key={member.id} member={member} onOpen={() => onOpen(member.id)} />)}</div>;
}

function DetailPanel({ regionName, isCountry, member, onMember, onBack }: {
  regionName: string; isCountry: boolean; member?: MemberRecord; onMember: (id: string) => void; onBack: () => void;
}) {
  if (member) return <div className="panel-content">
    <button className="text-back" onClick={onBack}>← 返回名單</button>
    <div className="profile-hero"><span className="profile-avatar" aria-hidden="true">{member.name.slice(0, 1)}</span><span className="eyebrow">LEGISLATOR PROFILE</span><h2>{member.name}</h2><p>第 11 屆 · {member.mandateStatus === 'active' ? '現任' : '2026 年離職'}</p></div>
    <div className="profile-facts"><div><span>姓名</span><div className="fact-value"><strong>{member.name}</strong><SourceLinks items={fieldSources(member, 'name')} label="姓名" /></div></div><div><span>選區</span><div className="fact-value"><strong>{member.districtLabel}</strong><SourceLinks items={fieldSources(member, 'districtLabel')} label="選區" /></div></div><div><span>任職狀態</span><div className="fact-value"><strong>{member.mandateStatus === 'active' ? '現任' : '已離職'}</strong><SourceLinks items={fieldSources(member, 'mandateStatus')} label="任職狀態" /></div></div><div><span>到職日期</span><div className="fact-value"><strong>{member.serviceStart}</strong><SourceLinks items={fieldSources(member, 'serviceStart')} label="到職日期" /></div></div>{member.serviceEnd && <div><span>離職生效日期</span><div className="fact-value"><strong>{member.serviceEnd}</strong><SourceLinks items={fieldSources(member, 'serviceEnd')} label="離職日期" /></div></div>}</div>
    <p className="source-note">資料基準日：{dataAsOfDate}。選區文字照錄立法院個人頁；人物頁資料由委員研究室提供，請以來源頁面為準。</p>
    <MemberEvents memberId={member.id} />
  </div>;

  const visible = isCountry ? members : membersForRegion(regionName);
  const districtMembers = visible.filter(item => item.seatType === 'district');
  return <div className="panel-content"><div className="panel-intro"><span className="eyebrow">2026 LEGISLATORS</span><h2>{regionName}</h2><p>2026-01-01 至 {dataAsOfDate} 曾在職的第 11 屆立法委員。縣市清單依官方選區文字分類。</p><p className="roster-source">名單來源：<a href={rosterSource.url} target="_blank" rel="noopener noreferrer">{rosterSource.publisher}第 11 屆名單 ↗</a></p></div>
    <div className="summary-strip"><div><strong>{visible.length}</strong><span>曾在職委員</span></div><div><strong>{visible.filter(item => item.mandateStatus === 'active').length}</strong><span>目前在職</span></div></div>
    <section className="panel-section"><div className="section-heading"><span className="eyebrow">DISTRICT SEATS</span><h3>{isCountry ? '區域委員' : '此縣市委員'} <span className="section-count">{districtMembers.length}</span></h3></div>{districtMembers.length ? <MemberList items={districtMembers} onOpen={onMember} /> : <div className="empty-state"><h4>此縣市沒有區域席次資料</h4><p>不分區與原住民席次請從全台灣名單查看。</p></div>}</section>
    {isCountry && specialSeats.map(([type, label]) => <section className="panel-section" key={type}><div className="section-heading"><h3>{label} <span className="section-count">{members.filter(item => item.seatType === type).length}</span></h3></div><MemberList items={members.filter(item => item.seatType === type)} onOpen={onMember} /></section>)}
  </div>;
}

export function App() {
  const navigate = useNavigate();
  const regionMatch = useMatch('/region/:regionId');
  const memberMatch = useMatch('/legislator/:legislatorId');
  const selectedMember = members.find(item => item.id === memberMatch?.params.legislatorId);
  const [map, setMap] = useState<TaiwanMapInstance | null>(null);
  const [regionNames, setRegionNames] = useState<Record<string, string>>({ TW: '全台灣' });
  const [mapError, setMapError] = useState('');
  const [navOpen, setNavOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const memberRegionId = selectedMember?.regionName
    ? Object.entries(regionNames).find(([, name]) => name === selectedMember.regionName)?.[0]
    : undefined;
  const regionId = regionMatch?.params.regionId ?? memberRegionId ?? 'TW';
  const regionName = regionId === 'TW' ? '全台灣' : regionNames[regionId] ?? '全台灣';
  useEffect(() => {
    if (!map) return;
    let cancelled = false;
    void map.listRegions('TW').then(items => { if (!cancelled) setRegionNames(current => ({ ...current, ...Object.fromEntries(items.map(item => [item.id, item.name])) })); });
    return () => { cancelled = true; };
  }, [map]);
  useEffect(() => {
    if (!map || regionId !== 'TW') return;
    let cancelled = false;
    let frame = 0;
    let observer: ResizeObserver | null = null;
    const fitMainland = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!cancelled) void map.fitGeometry(mainlandView).catch(error => { if (!cancelled) onMapError(error); });
      });
    };
    void map.ready.then(async () => {
      if (cancelled) return;
      const viewport = document.querySelector('.taiwan-atlas__viewport');
      if (viewport) {
        observer = new ResizeObserver(fitMainland);
        observer.observe(viewport);
      }
      await map.selectRegion('TW');
      if (!cancelled) fitMainland();
    }).catch(error => { if (!cancelled) onMapError(error); });
    return () => { cancelled = true; cancelAnimationFrame(frame); observer?.disconnect(); };
  }, [map, regionId]);
  const chooseRegion = (id: string) => { navigate(id === 'TW' ? '/' : `/region/${id.slice(0, 5)}`); setPanelOpen(true); };
  const chooseMember = (id: string) => { navigate(`/legislator/${id}`); setPanelOpen(true); };
  const onRegionChange = (region: RegionMeta) => setRegionNames(current => current[region.id] === region.name ? current : { ...current, [region.id]: region.name });
  const onMapError = (error: TaiwanMapError) => setMapError(error.message);
  const share = async () => { try { await navigator.clipboard.writeText(location.href); setCopied(true); window.setTimeout(() => setCopied(false), 2000); } catch { setCopied(false); } };
  const breadcrumb = selectedMember ? `${selectedMember.districtLabel} / ${selectedMember.name}` : regionName;

  return <div className="app-shell">
    <header className="app-header"><div className="brand"><span className="brand-symbol" aria-hidden="true">◎</span><div><span className="brand-name">委員地圖</span><span className="brand-english">LEGISMAP</span></div></div><div className="header-context"><span className="context-prefix">正在探索</span><span className="context-path">{breadcrumb}</span></div><div className="header-actions"><span className="demo-pill">資料截至 {dataAsOfDate}</span><button className="header-button share-button" onClick={share}>{copied ? '已複製連結' : '分享頁面 ↗'}</button><button className="header-button mobile-nav-button" onClick={() => setNavOpen(true)}>地區選單</button></div></header>
    <div className="disclaimer" role="note"><span className="disclaimer-dot" />名單與選區文字據立法院官方頁面整理；地圖顯示行政區，並非立委選區邊界。資料基準日 {dataAsOfDate}。</div>
    <div className="workspace">
      {navOpen && <button className="mobile-backdrop" aria-label="關閉地區選單" onClick={() => setNavOpen(false)} />}
      <aside className={`left-rail ${navOpen ? 'is-open' : ''}`}><button className="mobile-close" onClick={() => setNavOpen(false)}>關閉 ×</button><RegionNavigator map={map} selectedId={regionId} onSelect={chooseRegion} onClose={() => setNavOpen(false)} /></aside>
      <main className="map-area"><div className="map-heading"><div><span className="eyebrow">INTERACTIVE ATLAS</span><h1>從地圖，看見你的國會代表。</h1></div><button onClick={() => chooseRegion('TW')}>返回全台 ↗</button></div><div className="map-stage"><TaiwanDrilldownMap regionId={regionId} onRegionIdChange={chooseRegion} onRegionChange={onRegionChange} onError={onMapError} mapRef={setMap} style={{ height: '100%' }} />{mapError && <div className="map-error" role="alert">地圖無法載入：{mapError}</div>}<div className="map-legend"><span><i className="legend-admin" />行政區</span></div></div><div className="map-caption"><span>底圖：Taiwan-Atlas</span><span>選區分類依立法院個人頁文字</span></div></main>
      <aside className={`right-panel ${panelOpen ? 'is-open' : ''}`} aria-label="地區與人物資料"><div className="panel-mobile-handle"><button onClick={() => setPanelOpen(open => !open)}>{panelOpen ? '收合資料' : '查看資料'} {panelOpen ? '⌄' : '⌃'}</button></div><DetailPanel regionName={regionName} isCountry={regionId === 'TW'} member={selectedMember} onMember={chooseMember} onBack={() => chooseRegion(memberRegionId ?? 'TW')} /></aside>
    </div>
  </div>;
}
