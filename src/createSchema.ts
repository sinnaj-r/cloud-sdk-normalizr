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

/**
 *  This function creates the Normalizr Entities.
 *
 * @template T The SDK Entity Type
 * @param {Constructable<T>} constructable A Constructable for the Type T
 * @param {string[]} entityNames A List of allow-listed Entities
 * @returns A Name-to-Normalizr-Entity Map
 */
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
/**
 * This Defines the Navigation Properties on the Normalizr Entities.
 *
 * @template T The SDK Entity Type
 * @param {Constructable<T>} constructable A Constructable for the Type T
 * @param {EntitiesType} entities A Name-to-Normalizr-Entity Map
 * @param {string[]} definiedEntities A List of allow-listed Entities
 */
const defineAttributes = <T extends SDKEntity>(
  constructable: Constructable<T>,
  entities: EntitiesType,
  definiedEntities: string[],
) => {
  const attributes: Record<any, any> = {};
  definiedEntities.push(constructable._entityName);
  for (const prop of constructable._allFields) {
    if (prop._fieldName === '_up' || prop._fieldName === 'up_') {
      continue;
    }
    if (prop instanceof OneToOneLink) {
      // Check if the Entity should be normalized
      if (prop._linkedEntity._entityName in entities) {
        attributes[prop._fieldName] = entities[prop._linkedEntity._entityName];
      }
    }
    if (prop instanceof OneToManyLink) {
      // Check if the Entity should be normalized
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
/**
 * Creates a Normalizr Schema
 *
 * @template T The SDK Entity Type
 * @param {Constructable<T>} constructable A Constructable for the Type T
 * @param {string[]} entityNames A List of allow-listed Entities
 * @returns A Normalizr Schema
 */
export const createSchema = <T extends SDKEntity>(
  constructable: Constructable<T>,
  entityNames: string[],
) => {
  const entities = createEntities(constructable, entityNames);
  defineAttributes(constructable, entities, []);
  return new schema.Array(entities[constructable._entityName]);
};
