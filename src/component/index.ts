export interface Component {
  init(): Promise<any>;
  release(): Promise<any>;
}
