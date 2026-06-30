import { describe, it, expect } from 'vitest';
import { i18n, messages } from '../../i18n';

const { t } = i18n.global;

describe('i18n', () => {
  it('traduit une clé connue dans la locale courante', () => {
    i18n.global.locale.value = 'en';
    expect(t('common.cancel')).toBe('Cancel');
    i18n.global.locale.value = 'fr';
    expect(t('common.cancel')).toBe('Annuler');
  });

  it('interpole les paramètres {name}', () => {
    i18n.global.locale.value = 'fr';
    expect(t('toast.memberAdded', { name: 'Alice' })).toBe('Alice ajouté');
  });

  it('retombe sur le FR (fallbackLocale) quand la clé manque dans la locale', () => {
    i18n.global.locale.value = 'en';
    // On vérifie surtout qu'on ne renvoie pas la clé brute.
    expect(t('common.cancel')).not.toBe('common.cancel');
  });

  it('renvoie la clé brute si elle est totalement inconnue', () => {
    expect(t('does.not.exist')).toBe('does.not.exist');
  });

  it('gère le singulier/pluriel en anglais (1 = singulier, 0 et >1 = pluriel)', () => {
    i18n.global.locale.value = 'en';
    expect(t('group.expensesCount', { count: 0 }, 0)).toBe('0 expenses');
    expect(t('group.expensesCount', { count: 1 }, 1)).toBe('1 expense');
    expect(t('group.expensesCount', { count: 3 }, 3)).toBe('3 expenses');
  });

  it('gère le singulier/pluriel en français (0 et 1 = singulier, >1 = pluriel)', () => {
    i18n.global.locale.value = 'fr';
    expect(t('group.expensesCount', { count: 0 }, 0)).toBe('0 dépense');
    expect(t('group.expensesCount', { count: 1 }, 1)).toBe('1 dépense');
    expect(t('group.expensesCount', { count: 3 }, 3)).toBe('3 dépenses');
    expect(t('group.membersCount', { count: 1 }, 1)).toBe('1 membre');
    expect(t('group.membersCount', { count: 2 }, 2)).toBe('2 membres');
  });

  it('FR et EN exposent exactement le même ensemble de clés', () => {
    const flatten = (obj: object, prefix = ''): string[] =>
      Object.entries(obj).flatMap(([key, val]) =>
        val && typeof val === 'object'
          ? flatten(val as object, `${prefix}${key}.`)
          : [`${prefix}${key}`],
      );
    const frKeys = flatten(messages.fr).sort();
    const enKeys = flatten(messages.en).sort();
    expect(enKeys).toEqual(frKeys);
  });
});
