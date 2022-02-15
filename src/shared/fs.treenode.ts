import { readdirSync, statSync } from 'fs';
import { join, normalize } from 'path'

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

  static isExcludedDirPath(path: string): boolean {
    for (let i = 0; i < exclusions.length; i++) {
      if (path === (normalize(exclusions[i]))) return true;
    }
    return false;
  }

  public static buildTree(rootPath: string, nodeName: string) {
    const root = new TreeNode(rootPath, nodeName);

    const stack = [root];

    while (stack.length) {
      const currentNode = stack.pop();
      if (currentNode) {
        const children = readdirSync(currentNode.path);
        children
        .filter((child: string) => !this.isExcludedDirPath(currentNode.path) && !exclusions.includes(child))
        .forEach((child: string) => {
          const childPath = join(currentNode.path, child);
          const childNode = new TreeNode(childPath, child);
          if (!this.isExcludedDirPath(childNode.path)) {
            currentNode.items.push(childNode);
            if (statSync(childNode.path).isDirectory()) {
              childNode.type = 'dir';
              stack.push(childNode);
            }
          }
        });
        currentNode.items = currentNode.items.sort((a, b) => {
          if (a.type == 'dir' && b.type == 'file') return -1;
          if (a.type == 'file' && b.type == 'dir') return 1;
          return 0;
        });
      }
    }
    return root;
  }
}
