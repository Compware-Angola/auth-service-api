export enum UserRole {
  DOCENTE = 'docente',
  DIREITOR_CURSO='direitor_curso'

  // outros roles...
}

export interface UserRoles {
  [UserRole.DOCENTE]: boolean;
  [UserRole.DIREITOR_CURSO]: boolean;

  // outros roles...
}