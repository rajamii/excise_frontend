export function getDeviceMetadata() {
  return {
    user_agent: navigator.userAgent.substring(0, 250),
    accept_header: "text/html",
    browser_tz: new Date().getTimezoneOffset().toString(), 
    browser_color_depth: screen.colorDepth ? screen.colorDepth.toString() : "32",
    browser_java_enabled: navigator.javaEnabled() ? "true" : "false",
    browser_screen_height: screen.height ? screen.height.toString() : "1080",
    browser_screen_width: screen.width ? screen.width.toString() : "1920",
    browser_language: navigator.language || "en-US",
    browser_javascript_enabled: "true"
  };
}