/**
 * Maps administrative role names, role IDs, and stage names to their
 * standardized level labels:
 * - District User (roleId 4) -> Level 1
 * - Site Enquiry / Site Inquiry / Sub Enquiry Officer (roleId 8) -> Level 2
 * - Joint Commissioner (roleId 9) -> Level 3
 * - Commissioner (roleId 10) -> Level 4
 */

const ROLE_ID_TO_LEVEL: Record<number, string> = {
  4: 'Level 1',
  8: 'Level 2',
  9: 'Level 3',
  10: 'Level 4',
};

/**
 * Returns the level label (e.g. 'Level 1'..'Level 4') when the given roleId or
 * role/stage name corresponds to one of the 4 workflow levels; otherwise returns
 * the original value unchanged.
 */
export function mapRoleOrStageToLevel(value: string | null | undefined, roleId?: number | null): string {
  if (roleId !== null && roleId !== undefined && ROLE_ID_TO_LEVEL[Number(roleId)]) {
    return ROLE_ID_TO_LEVEL[Number(roleId)];
  }

  const raw = String(value ?? '').trim();
  if (!raw || raw === '-') {
    return raw;
  }

  const normalized = raw
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (normalized === 'district user' || normalized === 'level 1') {
    return 'Level 1';
  }
  if (
    normalized === 'site inquiry officer' ||
    normalized === 'site enquiry officer' ||
    normalized === 'sub enquiry officer' ||
    normalized === 'sub inquiry officer' ||
    normalized === 'site enquiry' ||
    normalized === 'site inquiry' ||
    normalized === 'level 2'
  ) {
    return 'Level 2';
  }
  if (normalized === 'joint commissioner' || normalized === 'level 3') {
    return 'Level 3';
  }
  if (normalized === 'commissioner' || normalized === 'level 4') {
    return 'Level 4';
  }

  return raw;
}

/**
 * Replaces occurrences of the 4 role/stage names inside composite display strings
 * (such as "Objection by District User" or "Commissioner Review") with their
 * corresponding Level 1-4 labels, while preserving other roles such as
 * "Deputy Commissioner" or "Assistant Commissioner".
 */
export function replaceRoleNamesWithLevels(text: string | null | undefined): string {
  const raw = String(text ?? '').trim();
  if (!raw || raw === '-') {
    return raw;
  }

  // If the entire string is an exact role/stage match, return the level directly.
  const exact = mapRoleOrStageToLevel(raw);
  if (exact !== raw) {
    return exact;
  }

  return raw
    .replace(
      /\b(?:site[\s_]+inquir(?:y|ies)[\s_]+officer|site[\s_]+enquir(?:y|ies)[\s_]+officer|sub[\s_]+enquir(?:y|ies)[\s_]+officer|sub[\s_]+inquir(?:y|ies)[\s_]+officer|site[\s_]+enquir(?:y|ies)|site[\s_]+inquir(?:y|ies))\b/gi,
      'Level 2'
    )
    .replace(/\bjoint[\s_]+commissioner\b/gi, 'Level 3')
    .replace(/\bdistrict[\s_]+user\b/gi, 'Level 1')
    .replace(/\b((?:deputy|assistant|joint)[\s_]+)?commissioner\b/gi, (full, prefix) =>
      prefix ? full : 'Level 4'
    );
}
