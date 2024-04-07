import { readdir, stat } from 'fs/promises';
import { Stats } from 'fs';
import { join, normalize } from 'path';

const exclusions: string[] = JSON.parse(process.env.CFG_EXCLUDE!);

const __cache: Map<string, TreeNode> = new Map();

enum TreeNodeType {
  DIR = 'dir',
  FILE = 'file',
}

const { DIR, FILE } = TreeNodeType;

export class TreeNode {
  public hasChildren?: boolean;
  public path: string;
  public items: Array<TreeNode> = [];
  public type: TreeNodeType = FILE;
  public name: string = 'configs';
  public expanded?: boolean = false;

  constructor(path: string, nodeName: string) {
    this.path = path;
    this.name = nodeName;
  }

  private static _isExcludedDirPath(path: string): boolean {
    for (let i = 0; i < exclusions.length; i++) {
      if (path === (normalize(exclusions[i]))) return true;
    }
    return false;
  }

  public static clearCache(rootPath?: string) {
    rootPath ? __cache.delete(rootPath)
             : __cache.clear();
  }

  public static async buildTree(rootPath: string, nodeName: string): Promise<TreeNode> {

    const cached: TreeNode | undefined = __cache.get(rootPath);

    if (cached) return cached;

    const root = new TreeNode(rootPath, nodeName);
          root.expanded = true;

    const stack: TreeNode[] = [root];

    while (stack.length) {
      const currentNode = stack.pop();
      
      if (currentNode) {    
        let children: string[] = await readdir(currentNode.path);

        children = children.filter((child: string) => !this._isExcludedDirPath(currentNode.path) && !exclusions.includes(child));
        
        for (const child of children) {

          const childPath: string = join(currentNode.path, child);
          const childNode: TreeNode = new TreeNode(childPath, child);

          currentNode.items.push(childNode);

          const nodeStats: Stats = await stat(childNode.path);

          if (nodeStats.isDirectory()) {
            childNode.type = DIR;
            stack.push(childNode);
          }
        }

        currentNode.items = currentNode.items.sort((a, b) => {
          if (a.type === DIR && b.type === FILE) return -1;
          if (a.type === FILE && b.type === DIR) return 1;
          return 0;
        });
      }
    }

    __cache.set(rootPath, root);

    return root;
  }
}