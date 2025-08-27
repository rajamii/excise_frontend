export class Role {
  id?: number;

  name: string = '';

  canView: string[] = [];
  canAdd: string[] = [];
  canUpdate: string[] = [];
  canDelete: string[] = [];

  rolePrecedence: number | null = null;

  constructor(init?: Partial<Role>) {
    Object.assign(this, init);
  }
}
