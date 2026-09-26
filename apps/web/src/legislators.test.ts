import { describe, expect, it } from 'vitest';
import { districtsForCounty, electoralDistricts, eventMembers, fieldSources, members, membersForDistrict, membersForRegion, sourcesForEvent } from './data/legislators.ts';

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

  it('maps all 73 geographic seats one-to-one and excludes special seats', () => {
    const districtMembers = members.filter(member => member.seatType === 'district');
    expect(electoralDistricts).toHaveLength(73);
    expect(districtMembers).toHaveLength(73);
    expect(new Set(districtMembers.map(member => member.electoralDistrictId)).size).toBe(73);
    expect(members.filter(member => member.seatType !== 'district').every(member => member.electoralDistrictId === null)).toBe(true);
    for (const district of electoralDistricts) {
      expect(membersForDistrict(district.id).map(member => member.id)).toEqual([district.memberId]);
    }
  });

  it('publishes correct county seat counts and preserves village-level split cases', () => {
    expect(districtsForCounty('63000')).toHaveLength(8);
    expect(districtsForCounty('65000')).toHaveLength(12);
    expect(districtsForCounty('68000')).toHaveLength(6);
    expect(districtsForCounty('67000')).toHaveLength(6);
    expect(districtsForCounty('10017')).toHaveLength(1);
    for (const [countyId, townName] of [['63000', '士林區'], ['65000', '三重區'], ['68000', '桃園區'], ['67000', '東區']]) {
      const splitUnits = districtsForCounty(countyId).flatMap(district => district.units.filter(unit => unit.townName === townName));
      expect(splitUnits.length).toBeGreaterThanOrEqual(2);
      expect(splitUnits.every(unit => (unit.villageNames?.length ?? 0) > 0)).toBe(true);
    }
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

  it('covers all eight Taichung members with sourced events and current case status', () => {
    const taichung = membersForRegion('臺中市');
    expect(taichung).toHaveLength(8);
    for (const member of taichung) {
      const research = eventMembers.get(member.id);
      expect(research?.reviewedCategories).toEqual(['contribution', 'good_deed', 'concern', 'anecdote']);
      expect(research?.events.some(event => event.category === 'contribution')).toBe(true);
      for (const event of research?.events ?? []) {
        expect(sourcesForEvent(event).length).toBeGreaterThan(0);
        expect(sourcesForEvent(event).every(source => source.url.startsWith('https://'))).toBe(true);
      }
    }
    const yen = taichung.find(member => member.name === '顏寬恒');
    expect(eventMembers.get(yen!.id)?.events.some(event => event.title.includes('最高法院撤銷發回'))).toBe(true);
  });

  it('covers all four Changhua members with sourced proposals and verified community events', () => {
    const changhua = membersForRegion('彰化縣');
    expect(changhua).toHaveLength(4);
    for (const member of changhua) {
      const research = eventMembers.get(member.id);
      expect(research?.reviewedCategories).toEqual(['contribution', 'good_deed', 'concern', 'anecdote']);
      expect(research?.events.some(event => event.category === 'contribution')).toBe(true);
      for (const event of research?.events ?? []) {
        expect(sourcesForEvent(event).length).toBeGreaterThan(0);
        expect(sourcesForEvent(event).every(source => source.url.startsWith('https://'))).toBe(true);
      }
    }
    const hsieh = changhua.find(member => member.name === '謝衣鳯');
    expect(eventMembers.get(hsieh!.id)?.events.some(event => event.category === 'anecdote')).toBe(true);
  });

  it('covers both Nantou members with sourced proposals and distinct dispute stages', () => {
    const nantou = membersForRegion('南投縣');
    expect(nantou).toHaveLength(2);
    for (const member of nantou) {
      const research = eventMembers.get(member.id);
      expect(research?.reviewedCategories).toEqual(['contribution', 'good_deed', 'concern', 'anecdote']);
      expect(research?.events.filter(event => event.category === 'contribution')).toHaveLength(2);
      expect(research?.events.some(event => event.category === 'concern')).toBe(true);
      for (const event of research?.events ?? []) expect(sourcesForEvent(event).length).toBeGreaterThan(0);
    }
    const ma = nantou.find(member => member.name === '馬文君');
    expect(eventMembers.get(ma!.id)?.events.some(event => event.processStatus === 'under_investigation')).toBe(true);
  });

  it('covers Yilan with sourced events in all four reviewed categories', () => {
    const yilan = membersForRegion('宜蘭縣');
    expect(yilan).toHaveLength(1);
    const research = eventMembers.get(yilan[0].id);
    expect(research?.reviewedCategories).toEqual(['contribution', 'good_deed', 'concern', 'anecdote']);
    expect(research?.events.filter(event => event.category === 'contribution')).toHaveLength(2);
    expect(new Set(research?.events.map(event => event.category))).toEqual(new Set(['contribution', 'good_deed', 'concern', 'anecdote']));
    for (const event of research?.events ?? []) {
      expect(sourcesForEvent(event).length).toBeGreaterThan(0);
      expect(sourcesForEvent(event).every(source => source.url.startsWith('https://'))).toBe(true);
    }
  });

  it('covers Hualien with official bills and sourced constitutional and recall outcomes', () => {
    const hualien = membersForRegion('花蓮縣');
    expect(hualien).toHaveLength(1);
    const research = eventMembers.get(hualien[0].id);
    expect(research?.reviewedCategories).toEqual(['contribution', 'good_deed', 'concern', 'anecdote']);
    expect(research?.events.filter(event => event.category === 'contribution')).toHaveLength(3);
    expect(research?.events.filter(event => event.category === 'concern')).toHaveLength(2);
    for (const event of research?.events ?? []) expect(sourcesForEvent(event).length).toBeGreaterThan(0);
  });

  it('covers both Yunlin members with sourced proposals and qualified outcomes', () => {
    const yunlin = membersForRegion('雲林縣');
    expect(yunlin).toHaveLength(2);
    for (const member of yunlin) {
      const research = eventMembers.get(member.id);
      expect(research?.reviewedCategories).toEqual(['contribution', 'good_deed', 'concern', 'anecdote']);
      expect(research?.events.filter(event => event.category === 'contribution')).toHaveLength(2);
      for (const event of research?.events ?? []) expect(sourcesForEvent(event).length).toBeGreaterThan(0);
    }
    const ding = yunlin.find(member => member.name === '丁學忠');
    expect(eventMembers.get(ding!.id)?.events.some(event => event.category === 'concern' && event.processStatus === 'resolved')).toBe(true);
  });

  it('covers Chiayi City with four reviewed categories and sourced events', () => {
    const city = membersForRegion('嘉義市');
    expect(city).toHaveLength(1);
    const research = eventMembers.get(city[0].id);
    expect(research?.reviewedCategories).toEqual(['contribution', 'good_deed', 'concern', 'anecdote']);
    expect(new Set(research?.events.map(event => event.category))).toEqual(new Set(['contribution', 'good_deed', 'concern', 'anecdote']));
    for (const event of research?.events ?? []) expect(sourcesForEvent(event).length).toBeGreaterThan(0);
  });

  it('covers both Chiayi County members with sourced proposals and qualified claims', () => {
    const county = membersForRegion('嘉義縣');
    expect(county).toHaveLength(2);
    for (const member of county) {
      const research = eventMembers.get(member.id);
      expect(research?.reviewedCategories).toEqual(['contribution', 'good_deed', 'concern', 'anecdote']);
      expect(research?.events.filter(event => event.category === 'contribution')).toHaveLength(2);
      for (const event of research?.events ?? []) expect(sourcesForEvent(event).length).toBeGreaterThan(0);
    }
    const tsai = county.find(member => member.name === '蔡易餘');
    expect(eventMembers.get(tsai!.id)?.events.some(event => event.category === 'concern')).toBe(true);
  });

  it('covers all six Tainan members and preserves first-instance status', () => {
    const tainan = membersForRegion('臺南市');
    expect(tainan).toHaveLength(6);
    for (const member of tainan) {
      const research = eventMembers.get(member.id);
      expect(research?.reviewedCategories).toEqual(['contribution', 'good_deed', 'concern', 'anecdote']);
      expect(research?.events.some(event => event.category === 'contribution')).toBe(true);
      for (const event of research?.events ?? []) expect(sourcesForEvent(event).length).toBeGreaterThan(0);
    }
    const lin = tainan.find(member => member.name === '林宜瑾');
    expect(eventMembers.get(lin!.id)?.events.some(event => event.processStatus === 'judgment_appealable')).toBe(true);
  });

  it('covers Taitung with sourced proposals and a qualified recall dispute', () => {
    const taitung = membersForRegion('臺東縣');
    expect(taitung).toHaveLength(1);
    const research = eventMembers.get(taitung[0].id);
    expect(research?.reviewedCategories).toEqual(['contribution', 'good_deed', 'concern', 'anecdote']);
    expect(research?.events.filter(event => event.category === 'contribution')).toHaveLength(2);
    expect(research?.events.some(event => event.category === 'concern' && event.processStatus === 'resolved')).toBe(true);
    for (const event of research?.events ?? []) expect(sourcesForEvent(event).length).toBeGreaterThan(0);
  });

  it('covers all eight Kaohsiung members with sourced events and indictment status', () => {
    const kaohsiung = membersForRegion('高雄市');
    expect(kaohsiung).toHaveLength(8);
    for (const member of kaohsiung) {
      const research = eventMembers.get(member.id);
      expect(research?.reviewedCategories).toEqual(['contribution', 'good_deed', 'concern', 'anecdote']);
      expect(research?.events.some(event => event.category === 'contribution')).toBe(true);
      for (const event of research?.events ?? []) expect(sourcesForEvent(event).length).toBeGreaterThan(0);
    }
    const lin = kaohsiung.find(member => member.name === '林岱樺');
    expect(eventMembers.get(lin!.id)?.events.some(event => event.category === 'concern' && event.processStatus === 'indicted')).toBe(true);
  });

  it('covers both Pingtung members with sourced contributions and qualified disputes', () => {
    const pingtung = membersForRegion('屏東縣');
    expect(pingtung).toHaveLength(2);
    for (const member of pingtung) {
      const research = eventMembers.get(member.id);
      expect(research?.reviewedCategories).toEqual(['contribution', 'good_deed', 'concern', 'anecdote']);
      expect(research?.events.some(event => event.category === 'contribution')).toBe(true);
      for (const event of research?.events ?? []) expect(sourcesForEvent(event).length).toBeGreaterThan(0);
    }
    const chung = pingtung.find(member => member.name === '鍾佳濱');
    expect(eventMembers.get(chung!.id)?.events.filter(event => event.category === 'concern')).toHaveLength(2);
    expect(eventMembers.get(chung!.id)?.events.some(event => event.processStatus === 'indicted')).toBe(true);
  });

  it('covers Penghu with sourced proposals and an accurate retirement announcement', () => {
    const penghu = membersForRegion('澎湖縣');
    expect(penghu).toHaveLength(1);
    const research = eventMembers.get(penghu[0].id);
    expect(research?.reviewedCategories).toEqual(['contribution', 'good_deed', 'concern', 'anecdote']);
    expect(research?.events.filter(event => event.category === 'contribution')).toHaveLength(2);
    expect(research?.events.some(event => event.category === 'anecdote')).toBe(true);
    for (const event of research?.events ?? []) expect(sourcesForEvent(event).length).toBeGreaterThan(0);
  });

  it('covers Kinmen with sourced proposals, a qualified allegation, and election registration', () => {
    const kinmen = membersForRegion('金門縣');
    expect(kinmen).toHaveLength(1);
    const research = eventMembers.get(kinmen[0].id);
    expect(research?.reviewedCategories).toEqual(['contribution', 'good_deed', 'concern', 'anecdote']);
    expect(research?.events.filter(event => event.category === 'contribution')).toHaveLength(2);
    expect(research?.events.some(event => event.category === 'concern' && event.processStatus === 'disputed')).toBe(true);
    expect(research?.events.some(event => event.category === 'anecdote')).toBe(true);
    for (const event of research?.events ?? []) expect(sourcesForEvent(event).length).toBeGreaterThan(0);
  });

  it('covers Lienchiang with a proposal and accurately staged investigation', () => {
    const lienchiang = membersForRegion('連江縣');
    expect(lienchiang).toHaveLength(1);
    const research = eventMembers.get(lienchiang[0].id);
    expect(research?.reviewedCategories).toEqual(['contribution', 'good_deed', 'concern', 'anecdote']);
    expect(research?.events.some(event => event.category === 'concern' && event.processStatus === 'under_investigation')).toBe(true);
    for (const event of research?.events ?? []) expect(sourcesForEvent(event).length).toBeGreaterThan(0);
  });

  it('covers every party-list and indigenous member with reviewed sourced records', () => {
    const specialMembers = members.filter(member => member.seatType !== 'district');
    expect(specialMembers).toHaveLength(47);
    for (const member of specialMembers) {
      const research = eventMembers.get(member.id);
      expect(research?.reviewedCategories).toEqual(['contribution', 'good_deed', 'concern', 'anecdote']);
      expect(research?.reviewedSourceTypes).toEqual(['legislative', 'government', 'oversight_and_judicial', 'independent_news', 'statements']);
      expect(research?.backgroundRecords).toHaveLength(1);
      for (const event of research?.events ?? []) expect(sourcesForEvent(event)).toHaveLength(1);
    }
  });
});
