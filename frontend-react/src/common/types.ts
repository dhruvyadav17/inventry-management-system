export type Status = 'active' | 'inactive' | 'archived';

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  status: Status;
  roles: string[];
  permissions: string[];
  profile_photo?: string | null;
  shops?: Array<{
    id: number;
    name: string;
    code: string;
    status: Status;
    is_primary: boolean;
  }>;
};

export type ResourceName = 'users' | 'roles' | 'permissions';

export type ResourceRecord = {
  id: number;
  name: string;
  email?: string;
  status: Status;
  roles?: string[];
  permissions?: string[];
  deleted_at?: string | null;
};

export type Paginator<T> = {
  data: T[];
  links: unknown;
  meta?: unknown;
};
