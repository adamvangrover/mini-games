/**
 * Centralized security utilities for XSS and Injection prevention.
 */
export default class Security {
    /**
     * Escapes HTML characters to prevent XSS.
     * @param {string} str - The string to escape.
     * @returns {string} The escaped string.
     */
    static escapeHTML(str) {
        if (str === null || str === undefined) return '';
        // Ensure numeric 0 is treated as a string "0" instead of empty string
        if (str === 0) return '0';

        return String(str).replace(/[&<>'"]/g,
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag]));
    }

    /**
     * Sanitizes a value for CSV to prevent Formula Injection (CSV Injection).
     * @param {string} val - The value to sanitize.
     * @returns {string} The sanitized value.
     */
    static sanitizeCSV(val) {
        if (val === null || val === undefined) return "";
        let str = String(val);
        // If it starts with dangerous characters, prepend a single quote to force text interpretation
        if (/^[=+\-@]/.test(str)) {
            return "'" + str;
        }
        return str;
    }

    /**
     * Checks if a string contains potential CSV injection characters at the start.
     * @param {string} val
     * @returns {boolean}
     */
    static detectCSVInjection(val) {
        if (!val) return false;
        return /^[=+\-@]/.test(String(val));
    }
}
