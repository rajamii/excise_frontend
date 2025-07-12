export class TokenUtil {
  static getTokenExpiry(token: string): number | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000; // Convert to ms
    } catch (e) {
      return null;
    }
  }
}
