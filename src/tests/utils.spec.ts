import { StringUtils } from '../utils/string.utils'
import { expect } from 'chai';
import 'mocha';

describe('String Util tests:', () => {
  it('getGUID : Generate unique strings', () => {
    let originalString = StringUtils.getGUID();
    let isDuplicate = false;
    for (let i = 0; i < 100000; i++) {
      originalString == StringUtils.getGUID() ? isDuplicate = true : null;
    }
    expect(isDuplicate).to.equal(false);
  });
});