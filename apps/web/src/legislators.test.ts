import { describe, expect, it } from 'vitest';
import { fieldSources, members, membersForRegion } from './data/legislators.ts';

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
});
