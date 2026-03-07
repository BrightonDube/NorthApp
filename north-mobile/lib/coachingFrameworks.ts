/**
 * Coaching Frameworks
 * 
 * Pre-built coaching frameworks that coaches can suggest or users can select.
 * Each framework has a name, description, steps, and system prompt addition.
 */

export interface CoachingFramework {
  id: string;
  name: string;
  icon: string;
  description: string;
  steps: string[];
  systemPromptAddition: string;
  category: 'decision' | 'planning' | 'reflection' | 'problem-solving';
  isPro: boolean;
}

export const COACHING_FRAMEWORKS: CoachingFramework[] = [
  {
    id: 'grow',
    name: 'GROW Model',
    icon: '🌱',
    description: 'Classic coaching framework: Goal, Reality, Options, Will',
    steps: [
      'Goal: What do you want to achieve?',
      'Reality: Where are you now?',
      'Options: What could you do?',
      'Will: What will you do?',
    ],
    systemPromptAddition: 'Use the GROW coaching model. Guide the user through: (1) Goal - clarify what they want to achieve, (2) Reality - explore their current situation, (3) Options - brainstorm possible approaches, (4) Will - commit to specific actions. Ask one question at a time.',
    category: 'planning',
    isPro: false,
  },
  {
    id: 'eisenhower',
    name: 'Eisenhower Matrix',
    icon: '📊',
    description: 'Prioritize tasks by urgency and importance',
    steps: [
      'List all your current tasks and commitments',
      'Categorize: Urgent + Important → Do now',
      'Categorize: Important + Not Urgent → Schedule',
      'Categorize: Urgent + Not Important → Delegate',
      'Categorize: Not Urgent + Not Important → Eliminate',
    ],
    systemPromptAddition: 'Help the user prioritize using the Eisenhower Matrix. Ask them to list their tasks, then help categorize each into: (1) Do First (urgent + important), (2) Schedule (important, not urgent), (3) Delegate (urgent, not important), (4) Eliminate (neither). Focus on what truly matters.',
    category: 'decision',
    isPro: false,
  },
  {
    id: 'five-whys',
    name: '5 Whys',
    icon: '🔍',
    description: 'Get to the root cause of any problem',
    steps: [
      'State the problem clearly',
      'Ask: Why did this happen? (1st Why)',
      'Ask: Why? again on the answer (2nd Why)',
      'Continue asking Why 3 more times',
      'Identify the root cause and action plan',
    ],
    systemPromptAddition: 'Use the 5 Whys technique. Start by helping the user clearly state their problem, then ask "Why?" repeatedly (up to 5 times) to drill down to the root cause. After finding the root cause, help them create an action plan to address it.',
    category: 'problem-solving',
    isPro: true,
  },
  {
    id: 'okrs',
    name: 'OKR Setting',
    icon: '🎯',
    description: 'Set Objectives and Key Results for your goals',
    steps: [
      'Define 1-3 inspiring Objectives',
      'For each Objective, set 3-5 measurable Key Results',
      'Ensure Key Results are specific and time-bound',
      'Identify leading indicators and check-in frequency',
    ],
    systemPromptAddition: 'Guide the user through setting OKRs (Objectives and Key Results). Help them define 1-3 qualitative, inspiring Objectives, then for each, create 3-5 quantitative, measurable Key Results. Ensure KRs are specific, time-bound, and achievable. Ask about check-in frequency.',
    category: 'planning',
    isPro: true,
  },
  {
    id: 'weekly-review',
    name: 'Weekly Review',
    icon: '📋',
    description: 'Structured reflection on your week',
    steps: [
      'Wins: What went well this week?',
      'Lessons: What did you learn?',
      'Challenges: What was difficult?',
      'Next week: What are your top 3 priorities?',
      'Gratitude: What are you thankful for?',
    ],
    systemPromptAddition: 'Conduct a structured weekly review. Guide the user through: (1) Celebrating wins from the week, (2) Identifying lessons learned, (3) Acknowledging challenges and how they were handled, (4) Setting top 3 priorities for next week, (5) Expressing gratitude. Keep it positive and forward-looking.',
    category: 'reflection',
    isPro: false,
  },
  {
    id: 'decision-matrix',
    name: 'Decision Matrix',
    icon: '⚖️',
    description: 'Make tough decisions with clarity',
    steps: [
      'Define the decision to be made',
      'List your options (2-5)',
      'Identify criteria that matter (cost, time, risk, etc.)',
      'Rate each option against each criterion',
      'Compare totals and discuss gut feeling',
    ],
    systemPromptAddition: 'Help the user make a decision using a weighted decision matrix. Guide them to: (1) clearly state the decision, (2) list all options, (3) identify evaluation criteria, (4) rate each option on each criterion (1-5), (5) review the results and compare with their intuition. Help them feel confident in their choice.',
    category: 'decision',
    isPro: true,
  },
];

/**
 * Get frameworks available for a user's tier
 */
export function getAvailableFrameworks(isProUser: boolean): CoachingFramework[] {
  if (isProUser) return COACHING_FRAMEWORKS;
  return COACHING_FRAMEWORKS.filter(f => !f.isPro);
}

/**
 * Get framework by ID
 */
export function getFrameworkById(id: string): CoachingFramework | undefined {
  return COACHING_FRAMEWORKS.find(f => f.id === id);
}
