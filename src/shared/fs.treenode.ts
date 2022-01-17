import { readdirSync, statSync } from 'fs';
import { join } from 'path'

const exclusions: string[] = JSON.parse(process.env.CFG_EXCLUDE!);

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

  public static buildTree(rootPath: string, nodeName: string) {
    const root = new TreeNode(rootPath, nodeName);

    const stack = [root];

    while (stack.length) {
      const currentNode = stack.pop();

      if (currentNode) {
        const children = readdirSync(currentNode.path);
        children
        .filter((child: string) => !exclusions.join().match(currentNode.path) && !exclusions.includes(child))
        .forEach((child: string) => {
          const childPath = join(currentNode.path, child);
          const childNode = new TreeNode(childPath, child);
          currentNode.items.push(childNode);
          if (statSync(childNode.path).isDirectory()) {
            childNode.type = 'dir';
            stack.push(childNode);
          }
        })
      }
    }

    return root;
  }
}
