import type { Root, Code } from "mdast";
import type { Plugin } from "unified";

type MdxJsxAttribute = {
  type: "mdxJsxAttribute";
  name: string;
  value: string;
};

type MdxJsxFlowElement = {
  type: "mdxJsxFlowElement";
  name: string;
  attributes: MdxJsxAttribute[];
  children: [];
};

const remarkMermaid: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree);
  };
};

function visit(node: { children?: (Root["children"][number] | MdxJsxFlowElement)[] }) {
  if (!node.children) return;

  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];

    if (child.type === "code" && (child as Code).lang === "mermaid") {
      const code = child as Code;
      node.children[i] = {
        type: "mdxJsxFlowElement",
        name: "MermaidDiagram",
        attributes: [
          {
            type: "mdxJsxAttribute",
            name: "chart",
            value: code.value,
          },
        ],
        children: [],
      };
    } else if ("children" in child) {
      visit(child as { children?: (Root["children"][number] | MdxJsxFlowElement)[] });
    }
  }
}

export default remarkMermaid;
