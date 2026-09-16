import type { ElectoralDistrict, Legislator } from '@legismap/shared-types';

/** Election geography is an application overlay, separate from the administrative tree. */
export function districtsForRegion(regionId: string, districts: readonly ElectoralDistrict[]): ElectoralDistrict[] {
  return regionId === 'TW' ? [...districts] : districts.filter(district => district.regionNodeIds.includes(regionId));
}

export function legislatorsForDistricts(districts: readonly ElectoralDistrict[], legislators: readonly Legislator[]): Legislator[] {
  const ids = new Set(districts.flatMap(district => district.legislatorIds));
  return legislators.filter(legislator => ids.has(legislator.id));
}

export function districtForLegislator(legislatorId: string, districts: readonly ElectoralDistrict[]): ElectoralDistrict | undefined {
  return districts.find(district => district.legislatorIds.includes(legislatorId));
}
