import { expect, it } from 'vitest';
import { parseHash } from './router';

it.each([
  ['', { name: 'songs' }],
  ['#/', { name: 'songs' }],
  ['#/gear', { name: 'gear' }],
  ['#/gear/', { name: 'gear' }],
  ['#/gear/new', { name: 'gearNew' }],
  ['#/gear/abc-1/edit', { name: 'gearEdit', id: 'abc-1' }],
  ['#/gear/a%20b/edit', { name: 'gearEdit', id: 'a b' }],
  ['#/gear/abc', { name: 'notFound', path: '/gear/abc' }],
  ['#/recipes?x=1', { name: 'recipes' }],
  ['#/data', { name: 'data' }],
  ['#/nope', { name: 'notFound', path: '/nope' }],
])('%s', (hash, route) => {
  expect(parseHash(hash)).toEqual(route);
});
