export class Workflow {
    id?: number;
    name: string;
    description: string;
  
    constructor(data: Partial<Workflow> = {}) {
      this.id = data.id;
      this.name = data.name || '';
      this.description = data.description || '';
    }
  }