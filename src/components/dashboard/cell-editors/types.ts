import type { MutableRefObject, RefObject } from 'react';
import type { SaveContext } from './save-handler';

export type TranslationFn = (key: string, values?: Record<string, string | number>) => string;

export interface TextEditorProps {
  inputRef: RefObject<HTMLInputElement | null>;
  editValue: string | number | boolean;
  setEditValue: (v: string | number | boolean) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  isLoading: boolean;
  error: string | null;
  isCompact?: boolean;
  field: string;
}

export interface NumberEditorProps {
  inputRef: RefObject<HTMLInputElement | null>;
  editValue: string | number | boolean;
  setEditValue: (v: string | number | boolean) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  isLoading: boolean;
  error: string | null;
  isCompact?: boolean;
}

export interface LoneivaEditorProps {
  value: string | number | boolean | null;
  editValue: string | number | boolean;
  setEditValue: (v: string | number | boolean) => void;
  isLoading: boolean;
  error: string | null;
  isCompact?: boolean;
  saveCtx: SaveContext;
  tDashboard: TranslationFn;
}

export interface BooleanEditorProps {
  value: string | number | boolean | null;
  editValue: string | number | boolean;
  setEditValue: (v: string | number | boolean) => void;
  selectOpen: boolean;
  setSelectOpen: (open: boolean) => void;
  isEditing: boolean;
  isLoading: boolean;
  error: string | null;
  isCompact?: boolean;
  saveCtx: SaveContext;
  lastSavedValueRef: MutableRefObject<string | number | boolean | null>;
  getBooleanTrueLabel: () => string;
  tDashboard: TranslationFn;
}

export interface DateEditorProps {
  value: string | number | boolean | null;
  editValue: string | number | boolean;
  setEditValue: (v: string | number | boolean) => void;
  showDatePicker: boolean;
  setShowDatePicker: (open: boolean) => void;
  isLoading: boolean;
  isCompact?: boolean;
  saveCtx: SaveContext;
  lastSavedValueRef: MutableRefObject<string | number | boolean | null>;
  tDashboard: TranslationFn;
}

export interface SelectEditorProps {
  value: string | number | boolean | null;
  editValue: string | number | boolean;
  setEditValue: (v: string | number | boolean) => void;
  selectOpen: boolean;
  setSelectOpen: (open: boolean) => void;
  isEditing: boolean;
  isLoading: boolean;
  error: string | null;
  isCompact?: boolean;
  options: string[];
  saveCtx: SaveContext;
  lastSavedValueRef: MutableRefObject<string | number | boolean | null>;
}
