import {
  DEPARTMENT_DEFINITIONS,
  buildDepartmentRoute,
  resolveDepartmentDefinition,
  type DepartmentRoute,
} from '@/constants/departments';
import type { DepartmentContact } from '@/types/database';

export function contactsToMap(contacts: DepartmentContact[]) {
  return Object.fromEntries(contacts.map((contact) => [contact.department_id, contact.email]));
}

export function buildContactDrafts(contacts: DepartmentContact[]) {
  const saved = contactsToMap(contacts);
  return Object.fromEntries(
    DEPARTMENT_DEFINITIONS.map((definition) => [definition.id, saved[definition.id] ?? ''])
  );
}

export function resolveRouteForCategory(
  category: string,
  contactDrafts: Record<string, string>
): DepartmentRoute {
  const definition = resolveDepartmentDefinition(category);
  return buildDepartmentRoute(definition, contactDrafts[definition.id] ?? '');
}
