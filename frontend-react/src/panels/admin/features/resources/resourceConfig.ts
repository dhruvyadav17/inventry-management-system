import type { ResourceName } from '@common/types';
import { adminResourceConfig } from '../../adminConfig';

export const resourceConfig = adminResourceConfig;

export function getResourceConfig(resource: ResourceName) {
  return resourceConfig[resource];
}
