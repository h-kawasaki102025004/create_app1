import { format, parseISO, differenceInDays, addDays } from 'date-fns';

// Date utilities
export class DateUtils {
  static formatDate(date: Date | string, formatStr: string = 'yyyy-MM-dd'): string {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, formatStr);
  }

  static parseDate(dateString: string): Date {
    return parseISO(dateString);
  }

  static getDaysUntilExpiry(expiryDate: string | Date): number {
    const expiry = typeof expiryDate === 'string' ? parseISO(expiryDate) : expiryDate;
    return differenceInDays(expiry, new Date());
  }

  static isExpiringSoon(expiryDate: string | Date, daysThreshold: number = 3): boolean {
    const daysUntil = this.getDaysUntilExpiry(expiryDate);
    return daysUntil <= daysThreshold && daysUntil >= 0;
  }

  static isExpired(expiryDate: string | Date): boolean {
    return this.getDaysUntilExpiry(expiryDate) < 0;
  }

  static addDaysToDate(date: Date | string, days: number): string {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return this.formatDate(addDays(dateObj, days));
  }

  static getCurrentDate(): string {
    return this.formatDate(new Date());
  }

  static getCurrentDateTime(): string {
    return new Date().toISOString();
  }
}

// Validation utilities
export class ValidationUtils {
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static isValidPassword(password: string): boolean {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return passwordRegex.test(password);
  }

  static isValidDate(dateString: string): boolean {
    try {
      const date = parseISO(dateString);
      return !isNaN(date.getTime());
    } catch {
      return false;
    }
  }

  static isValidQuantity(quantity: number): boolean {
    return typeof quantity === 'number' && quantity > 0 && isFinite(quantity);
  }

  static sanitizeString(input: string): string {
    return input.trim().replace(/[<>]/g, '');
  }

  static normalizeString(input: string): string {
    return input.toLowerCase().trim().replace(/\s+/g, ' ');
  }
}

// String utilities
export class StringUtils {
  static capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  static capitalizeWords(str: string): string {
    return str.split(' ').map(word => this.capitalize(word)).join(' ');
  }

  static slugify(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^\w ]+/g, '')
      .replace(/ +/g, '-');
  }

  static truncate(str: string, length: number, suffix: string = '...'): string {
    if (str.length <= length) return str;
    return str.slice(0, length) + suffix;
  }

  static generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static extractKeywords(text: string, minLength: number = 3): string[] {
    return text
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length >= minLength)
      .filter(word => !/^[0-9]+$/.test(word))
      .map(word => word.replace(/[^\w]/g, ''))
      .filter(word => word.length >= minLength);
  }
}

// Array utilities
export class ArrayUtils {
  static chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  static unique<T>(array: T[]): T[] {
    return [...new Set(array)];
  }

  static uniqueBy<T, K>(array: T[], keyFn: (item: T) => K): T[] {
    const seen = new Set<K>();
    return array.filter(item => {
      const key = keyFn(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  static groupBy<T, K extends string | number>(
    array: T[],
    keyFn: (item: T) => K
  ): Record<K, T[]> {
    return array.reduce((groups, item) => {
      const key = keyFn(item);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
      return groups;
    }, {} as Record<K, T[]>);
  }

  static sortBy<T>(array: T[], keyFn: (item: T) => string | number, desc = false): T[] {
    return [...array].sort((a, b) => {
      const aKey = keyFn(a);
      const bKey = keyFn(b);
      if (aKey < bKey) return desc ? 1 : -1;
      if (aKey > bKey) return desc ? -1 : 1;
      return 0;
    });
  }

  static intersection<T>(arr1: T[], arr2: T[]): T[] {
    return arr1.filter(item => arr2.includes(item));
  }

  static difference<T>(arr1: T[], arr2: T[]): T[] {
    return arr1.filter(item => !arr2.includes(item));
  }
}

// Object utilities
export class ObjectUtils {
  static pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
    const result = {} as Pick<T, K>;
    keys.forEach(key => {
      if (key in obj) {
        result[key] = obj[key];
      }
    });
    return result;
  }

  static omit<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
    const result = { ...obj };
    keys.forEach(key => {
      delete result[key];
    });
    return result;
  }

  static deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
    if (Array.isArray(obj)) return obj.map(item => this.deepClone(item)) as unknown as T;

    const cloned = {} as T;
    Object.keys(obj).forEach(key => {
      (cloned as any)[key] = this.deepClone((obj as any)[key]);
    });
    return cloned;
  }

  static isEmpty(obj: object): boolean {
    return Object.keys(obj).length === 0;
  }

  static isEqual<T>(obj1: T, obj2: T): boolean {
    if (obj1 === obj2) return true;
    if (obj1 == null || obj2 == null) return obj1 === obj2;
    if (typeof obj1 !== typeof obj2) return false;

    if (typeof obj1 === 'object') {
      const keys1 = Object.keys(obj1);
      const keys2 = Object.keys(obj2);

      if (keys1.length !== keys2.length) return false;

      return keys1.every(key =>
        this.isEqual((obj1 as any)[key], (obj2 as any)[key])
      );
    }

    return obj1 === obj2;
  }
}

// Number utilities
export class NumberUtils {
  static round(num: number, decimals: number = 2): number {
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

  static formatCurrency(amount: number, currency: string = 'JPY'): string {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  static formatNumber(num: number, locale: string = 'ja-JP'): string {
    return new Intl.NumberFormat(locale).format(num);
  }

  static clamp(num: number, min: number, max: number): number {
    return Math.min(Math.max(num, min), max);
  }

  static randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  static isInRange(num: number, min: number, max: number): boolean {
    return num >= min && num <= max;
  }
}

// Color utilities
export class ColorUtils {
  static hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result && result[1] && result[2] && result[3] ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  static rgbToHex(r: number, g: number, b: number): string {
    return "#" + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    }).join("");
  }

  static getContrastColor(bgColor: string): string {
    const rgb = this.hexToRgb(bgColor);
    if (!rgb) return '#000000';

    const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
    return brightness > 128 ? '#000000' : '#ffffff';
  }
}

// File utilities
export class FileUtils {
  static getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  static isImageFile(filename: string): boolean {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    return imageExtensions.includes(this.getFileExtension(filename));
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static generateUniqueFilename(originalName: string): string {
    const timestamp = Date.now();
    const random = StringUtils.generateRandomString(8);
    const ext = this.getFileExtension(originalName);
    return `${timestamp}_${random}.${ext}`;
  }
}

// Recipe utilities
export class RecipeUtils {
  static extractIngredients(recipeText: string): string[] {
    const lines = recipeText.split('\n');
    const ingredients: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && /^[・•-]/.test(trimmed)) {
        const ingredient = trimmed.replace(/^[・•-]\s*/, '');
        if (ingredient) ingredients.push(ingredient);
      }
    }

    return ingredients;
  }

  static matchIngredients(available: string[], required: string[]): {
    matched: string[];
    missing: string[];
    percentage: number;
  } {
    const normalizedAvailable = available.map(i => ValidationUtils.normalizeString(i));
    const normalizedRequired = required.map(i => ValidationUtils.normalizeString(i));

    const matched = required.filter(req =>
      normalizedAvailable.some(avail =>
        normalizedAvailable.includes(ValidationUtils.normalizeString(req)) ||
        ValidationUtils.normalizeString(req).includes(avail) ||
        avail.includes(ValidationUtils.normalizeString(req))
      )
    );

    const missing = required.filter(req => !matched.includes(req));
    const percentage = Math.round((matched.length / required.length) * 100);

    return { matched, missing, percentage };
  }

  static estimateCookingTime(instructions: string[]): number {
    let totalTime = 0;

    for (const instruction of instructions) {
      const timeMatch = instruction.match(/(\d+)分/);
      if (timeMatch && timeMatch[1]) {
        totalTime += parseInt(timeMatch[1], 10);
      }
    }

    // Default estimation if no time specified
    if (totalTime === 0) {
      totalTime = instructions.length * 5; // 5 minutes per step
    }

    return Math.max(totalTime, 10); // Minimum 10 minutes
  }

  static categorizeDifficulty(instructions: string[]): 'easy' | 'medium' | 'hard' {
    const instructionCount = instructions.length;
    const complexWords = ['炒める', '煮込む', '蒸す', '揚げる', 'マリネ'];

    const complexity = instructions.reduce((score, instruction) => {
      const hasComplexWord = complexWords.some(word => instruction.includes(word));
      return score + (hasComplexWord ? 1 : 0);
    }, 0);

    if (instructionCount <= 3 && complexity <= 1) return 'easy';
    if (instructionCount <= 6 && complexity <= 3) return 'medium';
    return 'hard';
  }
}

// Notification utilities
export class NotificationUtils {
  static createExpiryMessage(foodName: string, daysUntil: number): string {
    if (daysUntil === 0) {
      return `${foodName}が本日期限切れです！早めにお使いください。`;
    } else if (daysUntil === 1) {
      return `${foodName}が明日期限切れです。使い切りレシピをチェックしましょう！`;
    } else if (daysUntil > 1) {
      return `${foodName}があと${daysUntil}日で期限切れです。`;
    } else {
      return `${foodName}が期限切れです（${Math.abs(daysUntil)}日経過）`;
    }
  }

  static getNotificationPriority(type: string, daysUntil?: number): 'high' | 'medium' | 'low' {
    if (type === 'expiry_alert') {
      if (daysUntil !== undefined) {
        if (daysUntil <= 0) return 'high';
        if (daysUntil <= 1) return 'high';
        if (daysUntil <= 3) return 'medium';
      }
    }
    return 'low';
  }
}

// Search utilities
export class SearchUtils {
  static createSearchQuery(searchTerm: string, fields: string[]): string {
    const normalizedTerm = ValidationUtils.normalizeString(searchTerm);
    const keywords = StringUtils.extractKeywords(normalizedTerm);

    return keywords
      .map(keyword =>
        fields.map(field => `${field} ILIKE '%${keyword}%'`).join(' OR ')
      )
      .map(condition => `(${condition})`)
      .join(' AND ');
  }

  static highlightSearchTerms(text: string, searchTerm: string): string {
    if (!searchTerm) return text;

    const keywords = StringUtils.extractKeywords(searchTerm);
    let highlighted = text;

    keywords.forEach(keyword => {
      const regex = new RegExp(`(${keyword})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark>$1</mark>');
    });

    return highlighted;
  }

  static calculateRelevanceScore(text: string, searchTerm: string): number {
    if (!searchTerm) return 0;

    const normalizedText = ValidationUtils.normalizeString(text);
    const keywords = StringUtils.extractKeywords(searchTerm);

    let score = 0;
    keywords.forEach(keyword => {
      const occurrences = (normalizedText.match(new RegExp(keyword, 'g')) || []).length;
      score += occurrences;
    });

    return score;
  }
}