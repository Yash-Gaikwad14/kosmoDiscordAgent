/**
 * Dynamic Profession / Interest Role Detection
 *
 * Scope: Detects when a user explicitly reveals their profession or domain of interest,
 * and maps it to an approved Discord guild role.
 *
 * Approved Roles:
 *   - Tech & Engineering
 *   - Business & Strategy
 *   - Academia & Education
 *   - Law & Compliance
 *   - Creative & Design
 *
 * Strictly Restricted Roles (NEVER auto-assigned):
 *   - Kosmo Founder
 *   - Team Kosmo
 *   - High-Karma User (earned via Arcane XP only)
 *   - Moderator / Admin roles
 */

export const APPROVED_GUILD_ROLES = [
  'Tech & Engineering',
  'Business & Strategy',
  'Academia & Education',
  'Law & Compliance',
  'Creative & Design',
] as const;

export type ApprovedGuildRole = (typeof APPROVED_GUILD_ROLES)[number];

export const RESTRICTED_ROLES = new Set([
  'kosmo founder',
  'team kosmo',
  'high-karma user',
  'high karma user',
  'moderator',
  'admin',
  'administrator',
  'kosmo vip',
  'kosmo max',
  'kosmo pro',
  'feedback champion',
  'top inviter',
  'high roller',
  'muted',
]);

interface RoleKeywordMapping {
  role: ApprovedGuildRole;
  patterns: RegExp[];
}

const ROLE_PATTERNS: RoleKeywordMapping[] = [
  {
    role: 'Tech & Engineering',
    patterns: [
      /\b(?:i am|i'm|i work as|working as|im)\s+(?:an?|the)?\s*(?:[a-z-]+\s+)*(?:engineer|developer|architect|programmer|coder|specialist)\b/i,
      /\b(?:i work in|working in|i do)\s+(?:[a-z-]+\s+)*(?:tech|technology|software|software engineering|web development|programming|devops|cybersecurity|it|computer science|cloud)\b/i,
      /\b(?:i am|i'm|im)\s+(?:an?|the)?\s*(?:programmer|coder|developer|tech lead|cto|solutions architect)\b/i,
    ],
  },
  {
    role: 'Business & Strategy',
    patterns: [
      /\b(?:i am|i'm|i work as|working as|im)\s+(?:an?|the)?\s*(?:[a-z-]+\s+)*(?:product manager|project manager|product owner|scrum master|consultant|analyst|business analyst|growth lead|operations lead|marketer|marketing manager|sales lead|account executive|venture capitalist|angel investor|ceo|coo|cfo|cmo)\b/i,
      /\b(?:i work in|working in|i do)\s+(?:[a-z-]+\s+)*(?:business|strategy|finance|marketing|sales|operations|venture capital|private equity|consulting|management|e-commerce)\b/i,
      /\b(?:i am|i'm|im)\s+(?:an?|the)?\s*(?:founder|entrepreneur|startup founder|business owner)\b/i,
    ],
  },
  {
    role: 'Academia & Education',
    patterns: [
      /\b(?:i am|i'm|i work as|working as|im)\s+(?:an?|the)?\s*(?:[a-z-]+\s+)*(?:student|undergrad|graduate student|phd student|postdoc|researcher|scientist|academic|professor|teacher|lecturer|educator|instructor|tutor)\b/i,
      /\b(?:i work in|working in|i do)\s+(?:[a-z-]+\s+)*(?:academia|education|scientific research|teaching|university|academic research)\b/i,
      /\b(?:i study|i'm studying|im studying|studying)\s+(?:[a-z\s]+)(?:at\s+[a-z\s]+|in\s+college|in\s+university)?\b/i,
    ],
  },
  {
    role: 'Law & Compliance',
    patterns: [
      /\b(?:i am|i'm|i work as|working as|im)\s+(?:an?|the)?\s*(?:[a-z-]+\s+)*(?:lawyer|attorney|paralegal|counsel|general counsel|legal advisor|compliance officer|legal counsel|solicitor|barrister)\b/i,
      /\b(?:i work in|working in|i do)\s+(?:[a-z-]+\s+)*(?:law|corporate law|compliance|legal|regulatory affairs|policy|intellectual property)\b/i,
      /\b(?:i study|i'm studying|im studying|studying)\s+law\b/i,
    ],
  },
  {
    role: 'Creative & Design',
    patterns: [
      /\b(?:i am|i'm|i work as|working as|im)\s+(?:an?|the)?\s*(?:[a-z-]+\s+)*(?:ui\/ux designer|ui designer|ux designer|product designer|graphic designer|illustrator|animator|3d artist|video editor|motion designer|copywriter|creative director|art director|visual designer|artist|designer)\b/i,
      /\b(?:i work in|working in|i do)\s+(?:[a-z-]+\s+)*(?:design|graphic design|ui\/ux|creative|illustration|animation|video production|branding)\b/i,
    ],
  },
];

/**
 * Checks whether a role name is on the strictly restricted list.
 */
export function isRestrictedRole(roleName: string): boolean {
  if (!roleName) return true;
  return RESTRICTED_ROLES.has(roleName.toLowerCase().trim());
}

/**
 * Checks whether a role name is an approved guild role.
 */
export function isApprovedGuildRole(roleName: string): roleName is ApprovedGuildRole {
  if (!roleName) return false;
  return APPROVED_GUILD_ROLES.some(
    approved => approved.toLowerCase() === roleName.toLowerCase().trim()
  );
}

/**
 * Detects whether the user's message contains an explicit profession/domain self-declaration.
 * Returns the matching approved guild role name, or null if no strong match.
 */
export function detectProfessionRole(message: string): ApprovedGuildRole | null {
  if (!message || typeof message !== 'string') {
    return null;
  }

  const cleanMessage = message.trim();

  // Guard against passive questions or third-person mentions
  // e.g. "Can a software engineer use this?", "What is law?", "My friend is a lawyer"
  if (/^(?:what|how|why|can|is|does|will|could|should)\b/i.test(cleanMessage)) {
    return null;
  }

  for (const { role, patterns } of ROLE_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(cleanMessage)) {
        // Double check safety
        if (isRestrictedRole(role)) {
          return null;
        }
        return role;
      }
    }
  }

  return null;
}
