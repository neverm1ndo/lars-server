import fs from 'fs';
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
        const children = fs.readdirSync(currentNode.path);

        for (let child of children) {
          const childPath = `${currentNode.path}/${child}`;
          const childNode = new TreeNode(childPath, child);
          currentNode.items.push(childNode);

          if (fs.statSync(childNode.path).isDirectory()) {
            childNode.type = 'dir';
            stack.push(childNode);
          }
        }
      }
    }

    return root;
  }
}
