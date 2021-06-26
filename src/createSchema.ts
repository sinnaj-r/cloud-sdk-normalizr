/* eslint-disable no-underscore-dangle */
import {
  Constructable,
  Link,
  OneToManyLink,
  OneToOneLink,
} from '@sap-cloud-sdk/core';
import { Entity as SDKEntity } from '@sap-cloud-sdk/core/dist/odata-v4';
import { schema } from 'normalizr';

const { Entity } = schema;

type EntitiesType = Record<string, schema.Entity<any>>;

const createEntities = <T extends SDKEntity>(
  constructable: Constructable<T>,
  entityNames: string[],
) => {
  const entities: EntitiesType = {};
  for (const entity of entityNames) {
    entities[entity] = new Entity(entity);
  }
  return entities;
};

const defineAttributes = <T extends SDKEntity>(
  constructable: Constructable<T>,
  entities: EntitiesType,
  definiedEntities: string[],
) => {
  const attributes: Record<any, any> = {};
  definiedEntities.push(constructable._entityName);
  for (const prop of constructable._allFields) {
    if (prop instanceof OneToOneLink) {
      // The Entity should be normalized
      if (prop._linkedEntity._entityName in entities) {
        attributes[prop._fieldName] = entities[prop._linkedEntity._entityName];
      }
    }
    if (prop instanceof OneToManyLink) {
      // The Entity should be normalized
      if (prop._linkedEntity._entityName in entities) {
        attributes[prop._fieldName] = new schema.Array(
          entities[prop._linkedEntity._entityName],
        );
      }
    }
    if (prop instanceof Link) {
      const name = prop._linkedEntity._entityName;

      // Follow reference, if not known
      if (!definiedEntities.includes(name)) {
        const result = defineAttributes(
          prop._linkedEntity,
          entities,
          definiedEntities,
        );
        // eslint-disable-next-line no-unused-expressions
        result;
        if (!(name in entities)) {
          attributes[prop._fieldName] =
            prop instanceof OneToManyLink ? new schema.Array(result) : result;
        }
      }
    }
  }
  entities[constructable._entityName]?.define(attributes);
  return attributes;
};

export const createSchema = <T extends SDKEntity>(
  constructable: Constructable<T>,
  entityNames: string[],
) => {
  const entities = createEntities(constructable, entityNames);
  defineAttributes(constructable, entities, []);
  return new schema.Array(entities[constructable._entityName]);
};
