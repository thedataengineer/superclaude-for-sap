import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

const SKILLS_DIR = join(__dirname, '..', '..', 'skills');

const EXPECTED_SKILLS = [
  'setup', 'team', 'ralph', 'ralplan', 'ask', 'autopilot',
  'deep-interview', 'mcp-setup', 'sap-doctor', 'sap-option', 'teams',
  'release', 'create-object', 'analyze-code', 'analyze-symptom', 'program',
];

describe('Skills Validation', () => {
  it(`all ${EXPECTED_SKILLS.length} skill directories exist`, () => {
    for (const skill of EXPECTED_SKILLS) {
      const dir = join(SKILLS_DIR, skill);
      expect(existsSync(dir), `Missing skill directory: ${skill}`).toBe(true);
    }
  });

  for (const skill of EXPECTED_SKILLS) {
    describe(`sc4sap:${skill}`, () => {
      const skillFile = join(SKILLS_DIR, skill, 'SKILL.md');

      it('SKILL.md exists', () => {
        expect(existsSync(skillFile)).toBe(true);
      });

      it('has valid frontmatter', () => {
        if (!existsSync(skillFile)) return;
        const content = readFileSync(skillFile, 'utf-8');
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        expect(frontmatterMatch, 'Missing frontmatter delimiters').toBeTruthy();
        const fm = frontmatterMatch![1];
        expect(fm).toContain('name:');
        expect(fm).toContain('description:');
      });

      it('has sc4sap: prefix in name', () => {
        if (!existsSync(skillFile)) return;
        const content = readFileSync(skillFile, 'utf-8');
        const nameMatch = content.match(/name:\s*sc4sap:/);
        expect(nameMatch, 'Skill name must have sc4sap: prefix').toBeTruthy();
      });
    });
  }
});
