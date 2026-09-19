import { describe, expect, it } from 'vitest';
import { eventMembers, fieldSources, members, membersForRegion, sourcesForEvent } from './data/legislators.ts';

describe('2026 legislator snapshot', () => {
  it('covers every published member with direct field sources', () => {
    expect(members).toHaveLength(120);
    expect(members.filter(member => member.mandateStatus === 'active')).toHaveLength(113);
    expect(members.filter(member => member.mandateStatus === 'former')).toHaveLength(7);
    for (const member of members) {
      expect(fieldSources(member, 'name').some(source => source.url.includes(`nodeid=${member.id.slice(5)}`))).toBe(true);
      expect(fieldSources(member, 'districtLabel')[0]?.url).toContain(`nodeid=${member.id.slice(5)}`);
    }
  });

  it('keeps special seats out of county lists', () => {
    expect(membersForRegion('臺北市').every(member => member.seatType === 'district')).toBe(true);
    expect(membersForRegion('臺北市').some(member => member.name === '王世堅')).toBe(true);
    expect(membersForRegion('臺北市').some(member => member.name === '韓國瑜')).toBe(false);
  });

  it('publishes a complete sourced Keelung research batch', () => {
    const keelung = membersForRegion('基隆市');
    expect(keelung).toHaveLength(1);
    const research = eventMembers.get(keelung[0].id);
    expect(research?.reviewedCategories).toHaveLength(4);
    for (const event of research?.events ?? []) {
      expect(sourcesForEvent(event).length).toBeGreaterThan(0);
      expect(sourcesForEvent(event).every(source => source.url.startsWith('https://'))).toBe(true);
    }
  });

  it('covers all eight Taipei members with reviewed categories and sourced events', () => {
    const taipei = membersForRegion('臺北市');
    expect(taipei).toHaveLength(8);
    for (const member of taipei) {
      const research = eventMembers.get(member.id);
      expect(research?.reviewedCategories).toEqual(['contribution', 'good_deed', 'concern', 'anecdote']);
      expect(research?.events.some(event => event.category === 'contribution')).toBe(true);
      for (const event of research?.events ?? []) expect(sourcesForEvent(event).length).toBeGreaterThan(0);
    }
  });

  it('covers all twelve New Taipei members with sourced contributions', () => {
    const newTaipei = membersForRegion('新北市');
    expect(newTaipei).toHaveLength(12);
    for (const member of newTaipei) {
      const research = eventMembers.get(member.id);
      expect(research?.reviewedCategories).toEqual(['contribution', 'good_deed', 'concern', 'anecdote']);
      expect(research?.events.some(event => event.category === 'contribution')).toBe(true);
      for (const event of research?.events ?? []) {
        expect(sourcesForEvent(event).length).toBeGreaterThan(0);
        expect(sourcesForEvent(event).every(source => source.url.startsWith('https://'))).toBe(true);
      }
    }
  });

  it('shows multiple sourced Taoyuan events in the same category', () => {
    const taoyuan = membersForRegion('桃園市');
    expect(taoyuan).toHaveLength(6);
    for (const member of taoyuan) {
      const research = eventMembers.get(member.id);
      expect(research?.reviewedCategories).toEqual(['contribution', 'good_deed', 'concern', 'anecdote']);
      expect(research?.events.filter(event => event.category === 'contribution')).toHaveLength(2);
      for (const event of research?.events ?? []) expect(sourcesForEvent(event).length).toBeGreaterThan(0);
    }
    const wan = taoyuan.find(member => member.name === '萬美玲');
    expect(eventMembers.get(wan!.id)?.events.filter(event => event.category === 'good_deed')).toHaveLength(2);
  });

  it('covers both Hsinchu County members with sourced legislative and community events', () => {
    const county = membersForRegion('新竹縣');
    expect(county).toHaveLength(2);
    for (const member of county) {
      const research = eventMembers.get(member.id);
      expect(research?.reviewedCategories).toEqual(['contribution', 'good_deed', 'concern', 'anecdote']);
      expect(research?.events.filter(event => event.category === 'contribution')).toHaveLength(2);
      expect(research?.events.some(event => event.category === 'good_deed')).toBe(true);
      for (const event of research?.events ?? []) expect(sourcesForEvent(event).length).toBeGreaterThan(0);
    }
  });

  it('covers Hsinchu City with sourced proposals and distinct controversy outcomes', () => {
    const city = membersForRegion('新竹市');
    expect(city).toHaveLength(1);
    const research = eventMembers.get(city[0].id);
    expect(research?.reviewedCategories).toEqual(['contribution', 'good_deed', 'concern', 'anecdote']);
    expect(research?.events.filter(event => event.category === 'contribution')).toHaveLength(3);
    expect(research?.events.filter(event => event.category === 'concern')).toHaveLength(2);
    for (const event of research?.events ?? []) {
      expect(sourcesForEvent(event).length).toBeGreaterThan(0);
      expect(sourcesForEvent(event).every(source => source.url.startsWith('https://'))).toBe(true);
    }
  });

  it('covers both Miaoli members with sourced proposals and documented case stages', () => {
    const miaoli = membersForRegion('苗栗縣');
    expect(miaoli).toHaveLength(2);
    for (const member of miaoli) {
      const research = eventMembers.get(member.id);
      expect(research?.reviewedCategories).toEqual(['contribution', 'good_deed', 'concern', 'anecdote']);
      expect(research?.events.filter(event => event.category === 'contribution')).toHaveLength(2);
      expect(research?.events.some(event => event.category === 'concern')).toBe(true);
      for (const event of research?.events ?? []) expect(sourcesForEvent(event).length).toBeGreaterThan(0);
    }
  });
});
