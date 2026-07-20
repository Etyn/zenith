import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const FORBIDDEN = ['react', 'react-native', 'expo', 'net', 'react-native-tcp-socket'];

// Attrape un import de `mod` suivi de `/` (sous-chemin), `-` (familles expo-*, react-*) ou de la guillemet fermante.
const forbiddenImportRegex = (mod: string) => new RegExp(`from ['"]${mod}(['"/-])`);

function tsFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return tsFiles(full);
    return full.endsWith('.ts') && !full.includes('__tests__') ? [full] : [];
  });
}

// Zones qui DOIVENT rester pures : le moteur ET ses données. Les futurs dossiers UI
// (src/app, src/ui) ne sont volontairement PAS inclus — ils pourront importer react/expo.
const PURE_ROOTS = [join(__dirname, '..'), join(__dirname, '..', '..', 'data')];

test('le moteur et les donnees n\'importent aucun module UI/reseau', () => {
  for (const root of PURE_ROOTS) {
    for (const file of tsFiles(root)) {
      const src = readFileSync(file, 'utf8');
      for (const mod of FORBIDDEN) {
        expect(src).not.toMatch(forbiddenImportRegex(mod));
      }
    }
  }
});

test('la detection attrape les familles expo-* / react-* sans faux positif', () => {
  const d = (line: string, mod: string) => forbiddenImportRegex(mod).test(line);
  expect(d(`import x from 'expo-router';`, 'expo')).toBe(true);
  expect(d(`import x from "expo-constants";`, 'expo')).toBe(true);
  expect(d(`import x from 'react-native';`, 'react')).toBe(true);
  expect(d(`import x from 'react';`, 'react')).toBe(true);
  expect(d(`import x from 'net';`, 'net')).toBe(true);
  expect(d(`import x from 'network-utils';`, 'net')).toBe(false);
});
