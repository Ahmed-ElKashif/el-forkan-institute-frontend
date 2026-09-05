/* User (staff account) shapes, mirrored from the API's `PublicUser`
   (src/users/users.mapper.ts). No password ever rides in a read. */

export interface User {
  id: string;
  fullName: string;
  username: string;
  gender: string;
  role: string;
  branchId: number | null;
  phone: string;
  email: string | null;
  isActive: boolean;
}

export interface UsersQuery {
  page: number;
  /** '' = every role. */
  role: string;
  search: string;
  includeInactive: boolean;
}

/** Create takes the fields the list read omits — username, gender, password —
 *  because they are set once and (username/gender) never change afterwards. */
export interface CreateUserInput {
  fullName: string;
  username: string;
  gender: string;
  phone: string;
  email?: string;
  password: string;
  role: string;
  branchId: number | null;
}

/** Update deliberately excludes username and gender (identity / composite-FK
 *  target on the API), and never the password (its own reset endpoint). */
export interface UpdateUserInput {
  fullName: string;
  phone: string;
  email: string | null;
  role: string;
  branchId: number | null;
  isActive: boolean;
}
