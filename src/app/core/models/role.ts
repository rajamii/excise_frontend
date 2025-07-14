export class Role {
  id?: number;

  name: string = '';

  canView: string[] = [];
  canAdd: string[] = [];
  canUpdate: string[] = [];
  canDelete: string[] = [];

  rolePrecedence: number = 0;

  constructor(init?: Partial<Role>) {
    Object.assign(this, init);
  }
}
