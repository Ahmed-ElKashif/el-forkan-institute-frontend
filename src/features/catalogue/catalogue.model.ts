/* Catalogue shapes, mirrored from the API (src/reference/catalogue.service.ts).
   Levels are fixed rows whose progression flags are edited; subjects and books
   are created and edited. */

export interface Level {
  id: number;
  code: string;
  nameAr: string;
  sortOrder: number;
  isOptional: boolean;
  isTerminal: boolean;
  allowsCarry: boolean;
  grantsCertificate: boolean;
  requiresCleanEntry: boolean;
}

/** The progression flags a head teacher may change (R1/R15/R20). */
export interface LevelFlags {
  isOptional: boolean;
  isTerminal: boolean;
  allowsCarry: boolean;
  grantsCertificate: boolean;
  requiresCleanEntry: boolean;
}

export interface Alias {
  id: number;
  aliasAr: string;
  normalized: string;
}

export interface Subject {
  id: number;
  code: string;
  nameAr: string;
  shortNameAr: string | null;
  nameEn: string | null;
  isActive: boolean;
  aliases: Alias[];
}

/** `code` is set once (seeds and imports resolve against it) and never edited. */
export interface CreateSubjectInput {
  code: string;
  nameAr: string;
  shortNameAr?: string;
  nameEn?: string;
}

export interface UpdateSubjectInput {
  nameAr: string;
  shortNameAr?: string;
  nameEn?: string;
  isActive: boolean;
}

export interface Book {
  id: number;
  titleAr: string;
  authorAr: string | null;
  notes: string | null;
  isActive: boolean;
}

export interface CreateBookInput {
  titleAr: string;
  authorAr?: string;
  notes?: string;
}

export interface UpdateBookInput {
  titleAr: string;
  authorAr?: string;
  notes?: string;
  isActive: boolean;
}
