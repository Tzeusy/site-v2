"use client";

import {
  ProductivityGraph3D,
  type ProductivityGraphCategory,
  type ProductivityGraphPost,
  type ProductivityGraphProps,
} from "@/components/productivity/productivity-graph-3d";

export type { ProductivityGraphCategory, ProductivityGraphPost, ProductivityGraphProps };

export function ProductivityGraph(props: ProductivityGraphProps) {
  return <ProductivityGraph3D {...props} />;
}
