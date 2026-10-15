import { describe, expect, it } from 'vitest';
import { parsePlaygroundInput, playgroundExamples, playgroundToolNames } from '@/lib/playground';
import { toolSchemas } from '@/lib/validation';

describe('playground tool examples', () => {
  it('provides schema-valid examples for all seven public tools', () => {
    expect(playgroundToolNames).toEqual([
      'search_members',
      'search_opportunities',
      'match_candidates',
      'recommend_team',
      'create_project',
      'request_introduction',
      'get_member_profile',
    ]);

    for (const name of playgroundToolNames) {
      expect(toolSchemas[name].safeParse(playgroundExamples[name]).success, name).toBe(true);
    }
  });

  it('parses and validates editable JSON before submission', () => {
    expect(parsePlaygroundInput('search_members', '{"query":"  React  "}')).toEqual({
      ok: true,
      input: { query: 'React' },
    });
    expect(parsePlaygroundInput('search_members', '{')).toMatchObject({ ok: false, kind: 'json' });
    expect(parsePlaygroundInput('get_member_profile', '{}')).toMatchObject({ ok: false, kind: 'schema' });
  });
});
