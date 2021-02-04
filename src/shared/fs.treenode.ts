import { readdirSync, statSync } from 'fs';

export class TreeNode {
  public path: string;
  public items: Array<TreeNode>;
  public type: string = 'file';
  public name: string = 'configs';

  constructor(path: string, nodeName: string) {
    this.path = path;
    this.items = [];
    this.name = nodeName;
  }

  public static excludes(name: string, nodePath: string): boolean {
    const excludes = JSON.parse(process.env.CFG_EXCLUDE!);
    for (let e of excludes) {
      if ((nodePath + '/' + name).includes(e)) return true;
    };
    return false;
  }

  public static buildTree(rootPath: string, nodeName: string) {
    const root = new TreeNode(rootPath, nodeName);

    const stack = [root];

    while (stack.length) {
      const currentNode = stack.pop();

      if (currentNode) {
        const children = readdirSync(currentNode.path);

        for (let child of children) {
          if (!this.excludes(child, currentNode.path)) {
          const childPath = `${currentNode.path}/${child}`;
          const childNode = new TreeNode(childPath, child);
          currentNode.items.push(childNode);

          if (statSync(childNode.path).isDirectory()) {
            childNode.type = 'dir';
              stack.push(childNode);
            }
          }
        }
      }
    }

    return root;
  }
}
