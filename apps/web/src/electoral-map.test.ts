import { describe, expect, it } from 'vitest';
import { districtsForRegion, legislatorsForDistricts } from '@legismap/electoral-map';
import { mockDistricts, mockLegislators } from './data/mock.ts';

describe('administrative to electoral adapter', () => {
  it('keeps district geometry separate and maps only explicit region IDs', () => {
    expect(districtsForRegion('63000', mockDistricts)).toHaveLength(2);
    expect(districtsForRegion('63000010', mockDistricts).map(item => item.id)).toEqual(['TPE-DEMO-01']);
    expect(districtsForRegion('65000', mockDistricts)).toEqual([]);
    expect(legislatorsForDistricts(districtsForRegion('64000', mockDistricts), mockLegislators).map(item => item.id)).toEqual(['demo-c']);
  });
});
