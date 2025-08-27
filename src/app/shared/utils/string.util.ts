export class StringUtil {
  /**
   * Converts camel case or snake case or kebab case to title case.
   */
  static toTitleCase(str: string | null | undefined): string {
    if (!str) return '';
    
    return str
      .replace(/[_\-]+/g, ' ')          // snake_case or kebab-case to spaces
      .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase to space
      .toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase());
  }
}
