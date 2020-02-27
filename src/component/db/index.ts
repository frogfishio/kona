import { Component } from '../index';

export interface DB extends Component {
  /**
   * Returns object by UUID
   * @param collectionName
   * @param id
   */
  get(collectionName: string, id: string, objectTypeName?: string, fileds?: Array<string>): Promise<any>;

  /**
   * Deletes object by UUID
   * @param collectionName
   * @param id
   */
  remove(collectionName: string, id: string): Promise<any>;

  /**
   * Restores deleted object by UUID
   * @param collectionName
   * @param criteria
   */
  restore(collectionName: string, criteria): Promise<any>;

  /**
   * Purges deleted object by UUID
   * @param collectionName
   * @param id
   */
  purge(collectionName: string, id: string): Promise<any>;

  /**
   * Finds data using query criteria
   * @param collectionName
   * @param criteria
   */
  find(collectionName: string, criteria): Promise<any>;

  /**
   * Finds one item using query criteria
   * @param collectionName
   * @param filter
   */
  findOne(collectionName: string, filter, objectTypeName?: string, fileds?: Array<string>): Promise<any>;

  /**
   * Runs aggregate query
   * @param collectionName
   * @param criteria
   */
  aggregate(collectionName: string, criteria): Promise<any>;

  /**
   * Creates object for owner
   * @param collectionName
   * @param owner
   * @param document
   */
  create(collectionName: string, owner, document): Promise<any>;

  /**
   * Updates object
   * @param collectionName
   * @param id
   * @param values
   */
  update(collectionName: string, idOrCriteria: string | any, values: any): Promise<any>;

  /**
   * Returns a count of objects with criteria
   * @param collectionName
   * @param criteria
   */
  count(collectionName: string, criteria): Promise<any>;

  /**
   * Drops whole collection
   * @param collectionName
   */
  drop(collectionName: string): Promise<any>;
}
