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
   * Deletes all objects matching criteria, this is very dangerous so
   * it is marked as separate function. This function can NOT auto purge
   * @param collectionName
   * @param criteria 
   */
  removeAll(collectionName: string, criteria: any): Promise<any>;

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
   * Updates all objects matching criteria. This is dangerous method and that's why it is 
   * separated out. The return signature is also different
   * @param collectionName 
   * @param criteria 
   * @param values 
   */
  updateAll(collectionName: string, criteria: any, values: any): Promise<any>;

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
