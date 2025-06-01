import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class FormDataService {
  private static camelToSnake(key: string): string {
    return key.replace(/([A-Z])/g, '_$1').toLowerCase();
  }

  /**
   * Converts a camelCase object into FormData with snake_case keys.
   * Supports nested objects and file inputs.
   */
  static buildFormData(data: Record<string, any>, form?: FormData, parentKey?: string): FormData {
    form = form || new FormData();

    for (const key in data) {
      if (!data.hasOwnProperty(key)) continue;

      const value = data[key];
      const snakeKey = this.camelToSnake(key);
      const formKey = parentKey ? `${parentKey}[${snakeKey}]` : snakeKey;

      if (value instanceof Date) {
        form.append(formKey, value.toISOString());
      } else if (value instanceof File) {
        form.append(formKey, value);
      } else if (typeof value === 'object' && value !== null) {
        this.buildFormData(value, form, formKey);
      } else if (value !== undefined && value !== null) {
        form.append(formKey, value);
      }
    }

    return form;
  }
}