import fixtures from '../../../fixtures/engine.json';
import { snapshot, type Session } from '..';

describe('shared fixtures (also run by the watchOS and Wear OS ports)', () => {
  for (const f of fixtures) {
    it(f.name, () => {
      for (const c of f.cases) {
        expect(snapshot(f.session as Session, c.now)).toEqual(c.snapshot);
      }
    });
  }
});
