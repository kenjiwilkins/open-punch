import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** clsx + tailwind-merge。Tailwind クラスの条件付き結合と衝突解決を行う。 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
