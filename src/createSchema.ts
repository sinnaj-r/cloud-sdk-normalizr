/* eslint-disable no-underscore-dangle */
import {
  Constructable,
  Link,
  OneToManyLink,
  OneToOneLink,
} from '@sap-cloud-sdk/core';
import { Entity as SDKEntity } from '@sap-cloud-sdk/core/dist/odata-v4';
import { camelCase } from '@sap-cloud-sdk/util';
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
 * @param {string[]} definedEntities A List of already defined Entities
 */
const defineAttributes = <T extends SDKEntity>(
  constructable: Constructable<T>,
  entities: EntitiesType,
  definedEntities: string[],
) => {
  const attributes: Record<any, any> = {};
  definedEntities.push(constructable._entityName);
  for (const prop of constructable._allFields) {
    const fieldName = camelCase(prop._fieldName);

    // Special Handling for Links (aka. Navigation Properties)
    if (prop instanceof Link) {
      const linkTarget = prop._linkedEntity._entityName;

      // Check if the Entity should be normalized
      if (linkTarget in entities) {
        if (prop instanceof OneToOneLink) {
          attributes[fieldName] = entities[linkTarget];
        }
        if (prop instanceof OneToManyLink) {
          attributes[fieldName] = new schema.Array(entities[linkTarget]);
        }
      }

      // Now recursively follow the Link
      // But only follow it, if it's not already known and not to the Parent
      if (!definedEntities.includes(linkTarget) && fieldName !== 'up') {
        const result = defineAttributes(
          prop._linkedEntity,
          entities,
          definedEntities,
        );
        // Only if the Link-Target is not in entities, e.g. a complex type,
        // set this attribute, else it will already be set
        if (!(linkTarget in entities)) {
          attributes[fieldName] =
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
