import { expect } from 'chai';
import { createSchema, normalize } from '../src';
import { ExampleItem1 } from './ExampleItem1/ExampleItem1';
import { ExampleItem1Data, ExampleItem2Data } from './mockItems';

describe('Cloud Sdk Normalizr', () => {
  it('can create a valid schema', () => {
    const schema = createSchema(ExampleItem1, ['ExampleItem1', 'ExampleItem2']);
    const result = normalize(ExampleItem1Data, schema);
    expect(result.entities).to.have.keys('ExampleItem1', 'ExampleItem2');
  });
  it('only normalizes specified entities', () => {
    const schema = createSchema(ExampleItem1, ['ExampleItem1']);
    const result = normalize(ExampleItem1Data, schema);
    expect(result.entities).to.not.have.key('ExampleItem2');
  });
  it('detects deeply nested references', () => {
    const schema = createSchema(ExampleItem1, ['ExampleItem1']);
    const result = normalize(ExampleItem1Data, schema);
    expect(result.entities.ExampleItem1['3']).to.have.deep.equal(
      ExampleItem2Data[2].parent,
    );
  });
});
