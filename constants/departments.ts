/** Report category → authority routing (emails configured by admin). */
export type DepartmentDefinition = {
  id: string;
  name: string;
  categoryLabels: string[];
};

export const DEPARTMENT_DEFINITIONS: DepartmentDefinition[] = [
  {
    id: 'waste',
    name: 'Waste Management',
    categoryLabels: ['Waste Management', 'Sanitation', 'Environment'],
  },
  {
    id: 'traffic',
    name: 'Traffic & Parking',
    categoryLabels: ['Traffic & Parking', 'Traffic', 'Safety', 'Parking'],
  },
  {
    id: 'potholes',
    name: 'Road issues',
    categoryLabels: ['Road issues', 'Potholes', 'Infrastructure'],
  },
  {
    id: 'drainage',
    name: 'Waterlogging & Drainage',
    categoryLabels: ['Waterlogging & Drainage', 'Drainage', 'Waterlogging', 'Flooding'],
  },
  {
    id: 'streetlights',
    name: 'Streetlights',
    categoryLabels: ['Streetlights'],
  },
  {
    id: 'governance',
    name: 'Governance',
    categoryLabels: ['Governance'],
  },
  {
    id: 'other',
    name: 'Other',
    categoryLabels: ['Other', 'general'],
  },
];

export const FALLBACK_DEPARTMENT_ID = 'other';

export function resolveDepartmentDefinition(category: string): DepartmentDefinition {
  const normalized = category.trim().toLowerCase();
  const match = DEPARTMENT_DEFINITIONS.find((definition) =>
    definition.categoryLabels.some((label) => label.toLowerCase() === normalized)
  );
  return match ?? DEPARTMENT_DEFINITIONS.find((d) => d.id === FALLBACK_DEPARTMENT_ID)!;
}

export type DepartmentRoute = {
  id: string;
  department: string;
  email: string;
};

export function buildDepartmentRoute(
  definition: DepartmentDefinition,
  email: string
): DepartmentRoute {
  return {
    id: definition.id,
    department: definition.name,
    email: email.trim(),
  };
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
