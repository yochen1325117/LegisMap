import { readFileSync, writeFileSync } from 'node:fs';

const roster = JSON.parse(readFileSync('data/research/ly11-2026.json', 'utf8'));
const data = JSON.parse(readFileSync('data/research/shared-events-2026.json', 'utf8'));
const events = new Map(data.events.map(event => [event.id, event]));
const rows = roster.members.map(member => {
  const links = data.participations.filter(item => item.memberId === member.id);
  const count = type => links.filter(item => events.get(item.eventId)?.type === type).length;
  return {
    memberId: member.id, name: member.name, seatType: member.seatType, regionName: member.regionName,
    bills: count('bill'), budgets: count('budget_oversight'), questions: count('questioning'),
    oversight: count('administrative_oversight'), namedVotes: count('named_vote'),
    publicEvents: links.filter(item => events.get(item.eventId)?.visibility === 'public').length,
  };
});
const coverage = key => rows.filter(row => row[key] > 0).length;
const output = {
  generatedAt: data.generatedAt, memberCount: rows.length,
  coverage: { bills: coverage('bills'), budgets: coverage('budgets'), questions: coverage('questions'), namedVotes: coverage('namedVotes') },
  members: rows,
};
writeFileSync('data/research/coverage-2026.json', `${JSON.stringify(output, null, 2)}\n`);
console.log(`Coverage — bills ${output.coverage.bills}/120, budgets ${output.coverage.budgets}/120, questions ${output.coverage.questions}/120, named votes ${output.coverage.namedVotes}/120.`);
